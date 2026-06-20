import { createAdminClient } from "../../lib/supabase-server";
import { procesarAudioOperador, procesarAudioVehiculo, procesarTextoVehiculo, analizarImagenEvidencia, analizarIntencionHistorica, procesarMensajeConContexto } from "../../lib/gemini";
import { generarReportePDF } from "../../lib/pdf-generator";
import crypto from "crypto";

// Helper: Guardar mensaje en historial de chat (tabla maquinaria.mensajes_chat)
async function guardarMensajeChat(supabase, whatsapp_remitente, rol, contenido, tipo_mensaje = "texto", reporte_id = null) {
  const { error } = await supabase
    .from("mensajes_chat")
    .insert({ whatsapp_remitente, reporte_id, rol, tipo_mensaje, contenido });
  if (error) console.error("[mensajes_chat] Error guardando mensaje:", error.message);
}

// Helper: Recuperar últimos N mensajes y formatearlos para Gemini
async function cargarHistorialGemini(supabase, whatsapp_remitente, limite = 6) {
  const { data, error } = await supabase
    .from("mensajes_chat")
    .select("rol, contenido")
    .eq("whatsapp_remitente", whatsapp_remitente)
    .order("created_at", { ascending: true })
    .limit(limite);

  if (error || !data?.length) return [];

  return data.map(msg => ({
    role: msg.rol, // 'user' o 'model'
    parts: [{ text: msg.contenido }]
  }));
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";

// ================================================================
// HELPER: Subir imagen a Supabase Storage
// Retorna el storage path (no la URL completa)
// ================================================================
async function uploadImagenStorage(supabase, imageBase64, mimeType) {
  const buffer = Buffer.from(imageBase64, "base64");
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ext = mimeType?.includes("png") ? "png" : "jpg";
  const fileName = `${fecha}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: mimeType || "image/jpeg",
      upsert: false,
    });

  if (error) {
    console.error("[whatsapp-incoming] Error subiendo imagen a Storage:", error.message);
    return null;
  }

  console.log(`[whatsapp-incoming] 📸 Imagen subida a Storage: ${fileName}`);
  return data.path; // ej: "2026-06-19/uuid.jpg"
}

// ================================================================
// HELPER: Generar signed URL de 24h para una imagen en Storage
// ================================================================
async function getSignedUrl(supabase, storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24); // 24 horas

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * API: /api/whatsapp-incoming
 * Máquina de estados para el bot de LukeMontaje.
 * 
 * Estados (sesiones_whatsapp.estado_espera):
 *   - Sin sesión     → espera REPORTE:CODIGO
 *   - ESPERANDO_CHECKIN_AUDIO → espera audio con horómetro inicial
 *   - SESION_ABIERTA_INTERMEDIA → acepta audios/imágenes de hitos
 *   - ESPERANDO_CHECKOUT_AUDIO → mismo que INTERMEDIA pero ya detectó cierre
 */

const BRIDGE_URL = process.env.WA_BRIDGE_URL || "http://localhost:3025";

// Enviar mensaje de texto por WhatsApp
async function enviarMensaje(jid, phone, texto) {
  const dest = jid || `${phone}@s.whatsapp.net`;
  try {
    await fetch(`${BRIDGE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: dest, text: texto }),
    });
  } catch (err) {
    console.error("[whatsapp-incoming] Error enviando mensaje:", err.message);
  }
}

// Notificar al supervisor sobre falla crítica
async function notificarSupervisor(supabase, supervisorId, mensaje) {
  if (!supervisorId) return;
  const { data: sup } = await supabase
    .from("personal")
    .select("whatsapp, nombre_completo")
    .eq("id", supervisorId)
    .maybeSingle();

  if (sup?.whatsapp) {
    await enviarMensaje(null, sup.whatsapp, `🚨 ALERTA CRÍTICA LukeMontaje:\n${mensaje}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  // Validar secreto del bridge
  const bridgeSecret = process.env.WA_BRIDGE_SECRET;
  if (bridgeSecret?.trim()) {
    if (req.headers["x-wa-bridge-secret"] !== bridgeSecret) {
      console.warn("[whatsapp-incoming] 🚫 Secreto inválido");
      return res.status(401).json({ success: false, message: "No autorizado" });
    }
  }

  const { phone, jid, message, audio, image, localImagePath, senderPn } = req.body;
  
  let searchPhone = senderPn || phone || "";
  if (typeof searchPhone === "string") {
    searchPhone = searchPhone.split("@")[0].split(":")[0];
  }
  const phoneClean = searchPhone.replace(/\+/g, "").trim();

  const geminiKey = process.env.GEMINI_API_KEY;
  const tieneAudioEntrante = !!(audio && audio.data);

  // Redefinir enviarMensaje localmente para usar Gemini TTS si la entrada fue por voz
  async function enviarMensaje(targetJid, targetPhone, texto) {
    const dest = targetJid || `${targetPhone}@s.whatsapp.net`;
    let audioBase64ParaEnviar = null;

    // Solo sintetizar si el usuario original envió audio y no hay URLs en la respuesta
    const contieneLink = texto.includes("http://") || texto.includes("https://") || texto.includes("lukeapp.me");
    if (tieneAudioEntrante && texto && !contieneLink && geminiKey) {
      try {
        const ttsModelName = "gemini-2.5-flash-preview-tts";
        console.log(`[whatsapp-incoming] 🎙️ Sintetizando voz con Gemini TTS: "${texto.substring(0, 50)}..."`);
        const ttsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ttsModelName}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: texto }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Charon" }
                  }
                }
              }
            })
          }
        );

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          const ttsParts = ttsData.candidates?.[0]?.content?.parts || [];
          for (const part of ttsParts) {
            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith("audio/")) {
              audioBase64ParaEnviar = part.inlineData.data;
              break;
            }
          }
        } else {
          const ttsErrBody = await ttsRes.text();
          console.error(`[whatsapp-incoming] Error TTS (${ttsRes.status}):`, ttsErrBody.substring(0, 200));
        }
      } catch (ttsErr) {
        console.error("[whatsapp-incoming] Error en síntesis de voz:", ttsErr.message);
      }
    }

    try {
      await fetch(`${BRIDGE_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dest,
          text: audioBase64ParaEnviar ? "" : texto,
          audioBase64: audioBase64ParaEnviar || null,
        }),
      });
    } catch (err) {
      console.error("[whatsapp-incoming] Error enviando mensaje a través del bridge:", err.message);
    }
  }

  if (!phoneClean) {
    return res.status(400).json({ success: false, message: "Falta phone" });
  }

  console.log(
    `[whatsapp-incoming] De: ${phoneClean} | ${audio ? "🎤 Audio" : image ? "📷 Imagen" : `💬 "${message}"`}`
  );

  // Simular presencia (escribiendo)
  const destJid = jid || `${phoneClean}@s.whatsapp.net`;
  fetch(`${BRIDGE_URL}/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: destJid, state: audio ? "recording" : "composing" }),
  }).catch(() => {});

  try {
    const supabase = createAdminClient();

    // ================================================================
    // 1. BUSCAR PERSONAL POR WHATSAPP
    // ================================================================
    const { data: personal } = await supabase
      .from("personal")
      .select("*, proyectos(*)")
      .or(`whatsapp.eq.${phoneClean},whatsapp.eq.+${phoneClean}`)
      .eq("activo", true)
      .maybeSingle();

    if (!personal) {
      // Buscar si el usuario ya tiene una solicitud de registro pendiente o rechazada
      const { data: registroPendiente } = await supabase
        .from("registros_pendientes")
        .select("*")
        .eq("whatsapp", phoneClean)
        .maybeSingle();

      const msgText = (message || "").trim();
      const prefix = "REGISTRO:";
      // Palabras reservadas que no son nombres reales (vienen del botón de la landing page)
      const SUFIJOS_RESERVADOS = ["NUEVO", "INICIO", "START", ""];
      let nombreDirecto = null;
      if (msgText.toUpperCase().startsWith(prefix)) {
        const sufijo = msgText.slice(prefix.length).trim();
        // Solo asignamos nombreDirecto si el sufijo es un nombre real (no una palabra reservada)
        if (sufijo && !SUFIJOS_RESERVADOS.includes(sufijo.toUpperCase())) {
          nombreDirecto = sufijo;
        }
      }

      // Atajo directo: si envía el comando REGISTRO: Juan Pérez (nombre explícito en el mensaje)
      if (nombreDirecto) {
        const { error: errUpsert } = await supabase
          .from("registros_pendientes")
          .upsert({
            whatsapp: phoneClean,
            nombre_completo: nombreDirecto,
            rol_solicitado: "Operador",
            estado: "pendiente",
            nota_rechazo: null,
            created_at: new Date().toISOString()
          }, { onConflict: "whatsapp" });

        if (errUpsert) {
          console.error("[whatsapp-incoming] Error al guardar registro pendiente:", errUpsert.message);
          await enviarMensaje(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`);
          return res.status(500).json({ success: false });
        }

        await enviarMensaje(jid, phoneClean,
          `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${nombreDirecto}\n• *Rol:* Operador\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias!`
        );
        return res.status(200).json({ success: true, action: "SOLICITUD_CREADA" });
      }

      // Caso especial: el usuario viene desde la landing page con REGISTRO:NUEVO
      // o cualquier otro comando de registro sin nombre — inicia flujo conversacional
      const esMensajeDeRegistro = msgText.toUpperCase().startsWith(prefix);

      // Caso 1: Si no tiene ningún registro en registros_pendientes, lo creamos con nombre_completo nulo
      if (!registroPendiente) {
        const { error: errInsert } = await supabase
          .from("registros_pendientes")
          .insert({
            whatsapp: phoneClean,
            nombre_completo: null,
            rol_solicitado: "Operador",
            estado: "pendiente",
            created_at: new Date().toISOString()
          });

        if (errInsert) {
          console.error("[whatsapp-incoming] Error creando registro inicial:", errInsert.message);
        }

        await enviarMensaje(jid, phoneClean,
          `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. Por favor, responde a este mensaje indicando tu *Nombre Completo* para enviar tu solicitud al Administrador.`
        );
        return res.status(200).json({ success: true, message: "Instrucciones de registro enviadas" });
      }

      // Caso 2: Si el registro existe pero el nombre es nulo, el mensaje actual es su nombre completo
      if (!registroPendiente.nombre_completo) {
        // Si el mensaje es el trigger de registro (REGISTRO:NUEVO u otro prefijo reservado), pedir nombre
        if (!msgText || esMensajeDeRegistro) {
          await enviarMensaje(jid, phoneClean,
            `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. Por favor, responde a este mensaje indicando tu *Nombre Completo* para enviar tu solicitud al Administrador.`
          );
          return res.status(200).json({ success: true, message: "Esperando nombre completo" });
        }

        const { error: errUpdate } = await supabase
          .from("registros_pendientes")
          .update({
            nombre_completo: msgText,
            estado: "pendiente",
            nota_rechazo: null,
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        if (errUpdate) {
          console.error("[whatsapp-incoming] Error guardando nombre completo:", errUpdate.message);
          await enviarMensaje(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`);
          return res.status(500).json({ success: false });
        }

        await enviarMensaje(jid, phoneClean,
          `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${msgText}\n• *Rol:* Operador\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias!`
        );
        return res.status(200).json({ success: true, action: "SOLICITUD_CREADA" });
      }

      // Caso 3: Si tiene registro completo pero está pendiente
      if (registroPendiente.estado === "pendiente") {
        await enviarMensaje(jid, phoneClean,
          `⏳ *Tu solicitud sigue pendiente*\n\nHola *${registroPendiente.nombre_completo}*, tu solicitud de registro como *Operador* está siendo revisada por un Administrador.\n\nTe notificaremos por este medio inmediatamente después de ser aprobada.`
        );
        return res.status(200).json({ success: true, message: "Solicitud pendiente" });
      }

      // Caso 4: Si la solicitud fue rechazada, reseteamos el nombre y le pedimos que lo ingrese de nuevo
      if (registroPendiente.estado === "rechazado") {
        const { error: errReset } = await supabase
          .from("registros_pendientes")
          .update({
            nombre_completo: null,
            estado: "pendiente",
            nota_rechazo: null,
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        if (errReset) {
          console.error("[whatsapp-incoming] Error reseteando solicitud rechazada:", errReset.message);
        }

        await enviarMensaje(jid, phoneClean,
          `❌ *Solicitud Anterior Rechazada*\n\nTu solicitud anterior fue rechazada.\n*Motivo:* ${registroPendiente.nota_rechazo || "No cumple con los requisitos de la faena."}\n\nPor favor, responde a este mensaje indicando tu *Nombre Completo* para enviar una nueva solicitud.`
        );
        return res.status(200).json({ success: true, message: "Solicitud rechazada reseteada" });
      }

      return res.status(200).json({ success: true, message: "No registrado" });
    }

    // ================================================================
    // 2. BUSCAR SESIÓN ACTIVA — debe ir antes del bloque admin
    // para evitar TDZ al evaluar `!sesion` en el guard de supervisor
    // ================================================================
    const { data: sesion } = await supabase
      .from("sesiones_whatsapp")
      .select("*, reportes_diarios(*)")
      .eq("whatsapp_remitente", phoneClean)
      .maybeSingle();

    // ================================================================
    // DESVÍO CONVERSACIONAL PARA SUPERVISORES / JEFES DE ÁREA
    // Si el supervisor/jefe tiene sesión de jornada activa, sigue el
    // flujo normal de operador (checkin audio, hitos, cierre).
    // Solo se desvía a Gemini Admin cuando NO está en medio de una jornada.
    // ================================================================
    const esAdmin = personal && (personal.rol === "Supervisor" || personal.rol === "Jefe de Area");
    const msgUpper = (message || "").trim().toUpperCase();

    if (esAdmin && !sesion && !msgUpper.startsWith("REPORTE:")) {
      console.log(`[whatsapp-incoming] 👑 Interacción de Administrador/Supervisor (${personal.nombre_completo})`);

      // 1. Cargar herramientas dinámicas desde Supabase (esquema maquinaria)
      let dbTools = [];
      try {
        const { data: loadedTools } = await supabase
          .from("bot_tools_dinamicas")
          .select("nombre_funcion, descripcion, esquema_json, codigo_javascript");
        if (loadedTools) dbTools = loadedTools;
      } catch (err) {
        console.error("[whatsapp-incoming] Error cargando herramientas dinámicas:", err.message);
      }

      // 2. Definir esquemas de herramientas
      const basicTools = [
        {
          name: "silenciar_usuario_por_desviacion",
          description: "Silencia o bloquea al usuario actual si sus mensajes se desvían de forma de forma insistente del propósito operacional del bot.",
          parameters: {
            type: "OBJECT",
            properties: {
              motivo: { type: "STRING", description: "Breve motivo del silencio." }
            },
            required: ["motivo"]
          }
        }
      ];

      const adminTools = [
        {
          name: "crear_herramienta_dinamica",
          description: "Crea y registra una nueva herramienta de consulta dinámica cuando el supervisor solicite un reporte, listado o búsqueda específica de datos de maquinaria, personal o reportes que no exista en el catálogo de herramientas. Debes proporcionarle el código JavaScript asíncrono compatible con Supabase ('supabase') y argumentos ('args') desestructurados en la primera línea, y el esquema JSON de parámetros.",
          parameters: {
            type: "OBJECT",
            properties: {
              nombre_funcion: {
                type: "STRING",
                description: "Nombre único de la función en snake_case (ej. 'obtener_operadores_proyecto'). Debe empezar con 'obtener_' o 'consultar_'."
              },
              descripcion: {
                type: "STRING",
                description: "Descripción clara de lo que hace la función y qué datos retorna."
              },
              codigo_javascript: {
                type: "STRING",
                description: "Código JS asíncrono compatible con Node.js que realice la consulta a Supabase usando 'supabase' y 'args'."
              },
              esquema_json: {
                type: "OBJECT",
                description: "Esquema JSON del parámetro parameters de la función."
              }
            },
            required: ["nombre_funcion", "descripcion", "codigo_javascript", "esquema_json"]
          }
        }
      ];

      const dynamicDeclarations = dbTools.map(t => {
        const parameters = t.esquema_json.parameters || t.esquema_json;
        return {
          name: t.nombre_funcion,
          description: t.description || t.descripcion,
          parameters: parameters
        };
      });

      const tools = [
        {
          functionDeclarations: [
            ...basicTools,
            ...adminTools,
            ...dynamicDeclarations
          ]
        }
      ];

      // 3. Prompt del sistema con mapa del mundo
      const mapaDelMundo = {
        proyectos: { id: "UUID", nombre_proyecto: "TEXT", codigo_cc: "TEXT", ubicacion: "TEXT", activa: "BOOLEAN" },
        personal: { id: "UUID", rut: "TEXT", nombre_completo: "TEXT", whatsapp: "TEXT", rol: "Supervisor | Operador | Rigger | Jefe de Area", turno_tipo: "TEXT", jornada_tipo: "Dia | Noche", proyecto_actual_id: "UUID REFERENCES proyectos", activo: "BOOLEAN" },
        equipos: { 
          id: "UUID", 
          codigo_interno: "TEXT", 
          descripcion_equipo: "TEXT", 
          proveedor: "TEXT", 
          proyecto_actual_id: "UUID REFERENCES proyectos", 
          estado_actual: "Equipo Operativo | Disponible | En Colacion | Detenido por Falla", 
          pauta_preventiva_activa: "TEXT",
          patente: "TEXT",
          marca: "TEXT",
          modelo: "TEXT",
          numero_serial: "TEXT",
          tipo: "TEXT",
          categoria: "TEXT",
          anio_fabricacion: "INTEGER",
          latitud_actual: "NUMERIC",
          longitud_actual: "NUMERIC",
          ultima_ubicacion_fecha: "TIMESTAMP"
        },
        reportes_diarios: { id: "UUID", equipo_id: "UUID", operador_id: "UUID", supervisor_id: "UUID", fecha: "DATE", horometro_inicio: "NUMERIC", horometro_final: "NUMERIC", horas_trabajadas: "NUMERIC", petroleo_litros: "NUMERIC", estado_final: "TEXT", pdf_url: "TEXT" },
        eventos_jornada: { id: "UUID", reporte_id: "UUID", estado_hito: "Trabajando | Disponible | En Colacion | Detenido por Falla", especialidad_id: "UUID", hora_evento: "TIMESTAMP", nota_transcripcion: "TEXT" },
        bot_tools_dinamicas: { id: "UUID", nombre_funcion: "TEXT UNIQUE", descripcion: "TEXT", codigo_javascript: "TEXT", esquema_json: "JSONB" },
        registros_pendientes: { id: "UUID", whatsapp: "TEXT", nombre_completo: "TEXT", rol_solicitado: "TEXT", estado: "pendiente | aprobado | rechazado", nota_rechazo: "TEXT" }
      };

      const obraAsignadaInfo = personal.proyectos
        ? `Proyecto / Faena actual: "${personal.proyectos.nombre_proyecto}" (Centro de Costos / Contrato / Código CC: "${personal.proyectos.codigo_cc}")`
        : 'Ningún proyecto, obra, faena o contrato asignado actualmente.';

      const promptSistemaAdmin = `
Eres jAIme, tu asistente virtual de Eimisa.
Interactúas con un supervisor o jefe de área. Sus datos actuales son:
- Nombre: ${personal.nombre_completo}
- Rol: ${personal.rol}
- WhatsApp: ${personal.whatsapp}
- ${obraAsignadaInfo}

Directrices de Comportamiento:
1. Responde de forma atenta, sumamente profesional, clara y concisa en español.
2. Identifícate de manera simple como "jAIme, tu asistente virtual de Eimisa" SOLO en la primera interacción o saludo inicial, o si te lo preguntan. NUNCA repitas este saludo en cada mensaje de una conversación fluida, ni lo agregues como firma fija en cada respuesta.
3. Prohibido reportar el flujo técnico interno: NUNCA le digas al usuario "He registrado la herramienta...", "Un momento por favor mientras consulto la base de datos...", "He creado la función..." u otras explicaciones de tus herramientas internas. Simplemente ejecuta la herramienta dinámica/SQL de forma silenciosa e invisible para el usuario y responde de inmediato directamente con la información o datos solicitados.
4. Entiende que los términos "obra", "proyecto", "faena" y "contrato" son sinónimos y se mapean directamente a los registros de la tabla 'proyectos'.
5. La asociación del personal (incluido el supervisor que habla contigo) con un proyecto se define mediante el campo 'proyecto_actual_id' de la tabla 'personal' (que referencia a 'proyectos.id').
6. Si te pregunta sobre su propio rol o qué proyecto/obra/faena/contrato tiene asociado, respóndele directamente usando los datos actuales proporcionados arriba. Si pregunta de forma general por "el proyecto" de un equipo específico u otra entidad, no lo confundas con el proyecto del supervisor: realiza la consulta adecuada en la base de datos.
7. Tienes acceso completo a consultas SQL asíncronas dinámicas de la base de datos de Supabase.
8. Si te pide un reporte, listado o cruce de datos personalizado que NO exista en tu catálogo de herramientas dinámicas, DEBES programar la consulta y registrar la herramienta llamando a "crear_herramienta_dinamica" en silencio, y luego responder con los resultados.
9. NOTAS DE DATOS Y COLUMNAS:
   - El año de fabricación de los equipos y su antigüedad se consultan en el campo 'anio_fabricacion' (escrito con 'n', no con 'ñ'). Mapea siempre las preguntas sobre "año de fabricación" a la columna 'anio_fabricacion'.
   - La columna 'pauta_preventiva_activa' (TEXT) en la tabla 'equipos' almacena pautas de seguridad, inspecciones críticas o mantenimiento preventivo actualmente activas para cada equipo. Si el supervisor te solicita agregar una pauta de seguridad o revisión a un grupo de equipos (por ejemplo, "revisar las tuercas de las ruedas a todas las camionetas"), crea y ejecuta inmediatamente una herramienta dinámica que realice un UPDATE en la tabla 'equipos' para establecer 'pauta_preventiva_activa' con la pauta proporcionada en todos los equipos que correspondan (ej. WHERE categoria = 'VEHÍCULOS MENORES' o tipo = 'CAMIONETAS'). Confirma el éxito de la operación al supervisor una vez realizada.

CRÍTICO - ESQUEMA DE BASE DE DATOS:
Todas las tablas pertenecen al esquema 'maquinaria'.
El cliente 'supabase' inyectado en tus herramientas ya está configurado internamente para usar el esquema 'maquinaria' por defecto. Por lo tanto, en tus códigos JavaScript debes consultar las tablas directamente sin prefijar el esquema (ej. escribe supabase.from("equipos") y NO supabase.from("maquinaria.equipos")).

Usa este mapa de tablas para estructurar tus códigos de herramientas dinámicas:
${JSON.stringify(mapaDelMundo, null, 2)}

Directrices al programar 'codigo_javascript' para "crear_herramienta_dinamica":
- Desestructura SIEMPRE los parámetros de entrada desde el objeto 'args' en la primera línea.
- Realiza la consulta a Supabase usando 'supabase' (ej. await supabase.from("equipos").select(...)).
- Usa comparaciones difusas con '.ilike("columna", \`%\${param}%\`)' para búsquedas de texto.
- Retorna el resultado (el array de filas o valor único).
- Ejemplo:
  const { nombre } = args;
  const { data, error } = await supabase.from("personal").select("nombre_completo, whatsapp").ilike("nombre_completo", \`%\${nombre}%\`);
  if (error) throw error;
  return data;
`;

      let parts = [];
      if (tieneAudioEntrante) {
        parts.push({
          inlineData: {
            mimeType: audio.mimeType || "audio/ogg",
            data: audio.data
          }
        });
      }
      parts.push({ text: message || "Analiza el audio e interactúa con el supervisor." });

      let contents = [{ role: "user", parts }];

      try {
        const modelName = "gemini-2.5-flash"; // Usar 2.5-flash para velocidad y function calling robusto
        let responseText = "";
        let runLoop = true;
        let iteracion = 0;
        const maxIteraciones = 4;
        
        let currentContents = [...contents];

        while (runLoop && iteracion < maxIteraciones) {
          iteracion++;
          
          const reqBody = {
            contents: currentContents,
            tools,
            systemInstruction: { parts: [{ text: promptSistemaAdmin }] }
          };

          const resGemini = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(reqBody)
            }
          );

          if (!resGemini.ok) {
            throw new Error(`Gemini API error: ${resGemini.status} - ${await resGemini.text()}`);
          }

          const dataGemini = await resGemini.json();
          const candidate = dataGemini.candidates?.[0];
          const resParts = candidate?.content?.parts || [];

          const functionCalls = resParts.filter(p => p.functionCall);
          const textParts = resParts.filter(p => p.text);

          if (textParts.length > 0) {
            responseText = textParts.map(p => p.text).join("\n");
          }

          if (functionCalls.length > 0) {
            console.log(`[whatsapp-incoming] [Iteración ${iteracion}] ⚡ Gemini solicitó ejecutar ${functionCalls.length} funciones.`);
            const functionResponses = [];

            // Refrescar dbTools en cada iteración en caso de que se haya creado una herramienta
            let activeDbTools = [];
            try {
              const { data: loadedTools } = await supabase
                .from("bot_tools_dinamicas")
                .select("nombre_funcion, descripcion, esquema_json, codigo_javascript");
              if (loadedTools) activeDbTools = loadedTools;
            } catch (err) {
              console.error("Error recargando herramientas dinámicas:", err.message);
            }

            for (const call of functionCalls) {
              const { name, args } = call.functionCall;
              let dbResult = "";

              try {
                if (name === "silenciar_usuario_por_desviacion") {
                  dbResult = "Silenciado con éxito.";
                } 
                else if (name === "crear_herramienta_dinamica") {
                  const { nombre_funcion, descripcion, codigo_javascript, esquema_json } = args;
                  console.log(`[whatsapp-incoming] 🛠️ Registrando nueva herramienta dinámica: ${nombre_funcion}`);

                  const { error: insertErr } = await supabase
                    .from("bot_tools_dinamicas")
                    .upsert([{
                      nombre_funcion,
                      descripcion,
                      codigo_javascript,
                      esquema_json
                    }], { onConflict: "nombre_funcion" });

                  if (insertErr) {
                    dbResult = `Error al registrar: ${insertErr.message}`;
                  } else {
                    dbResult = `Éxito: Herramienta "${nombre_funcion}" registrada exitosamente. Ya está lista para ser llamada con los argumentos adecuados.`;
                  }
                } 
                else if (activeDbTools.some(t => t.nombre_funcion === name)) {
                  const targetTool = activeDbTools.find(t => t.nombre_funcion === name);
                  console.log(`[whatsapp-incoming] ⚡ Ejecutando herramienta dinámica: ${name} con args:`, JSON.stringify(args));

                  try {
                    const fn = new Function("supabase", "args", `
                      return (async () => {
                        ${targetTool.codigo_javascript}
                      })();
                    `);
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Timeout de ejecución excedido (5s)")), 5000)
                    );
                    const resFn = await Promise.race([
                      fn(supabase, args),
                      timeoutPromise
                    ]);
                    dbResult = JSON.stringify(resFn);
                  } catch (execErr) {
                    dbResult = `Error de ejecución: ${execErr.message}`;
                  }
                } else {
                  dbResult = `Error: La herramienta "${name}" no está registrada en el sistema.`;
                }
              } catch (errCall) {
                dbResult = `Error en llamada de herramienta: ${errCall.message}`;
              }

              functionResponses.push({
                functionResponse: {
                  name: name,
                  response: { result: dbResult }
                }
              });
            }

            // Alimentar la respuesta de la función al historial de la API
            currentContents.push(candidate.content);
            currentContents.push({ role: "function", parts: functionResponses });

            // Actualizar catálogo de herramientas del modelo en base a las nuevas creadas
            try {
              const { data: updatedDbTools } = await supabase
                .from("bot_tools_dinamicas")
                .select("nombre_funcion, descripcion, esquema_json");
              if (updatedDbTools) {
                const newDynamicDeclarations = updatedDbTools.map(t => ({
                  name: t.nombre_funcion,
                  description: t.description || t.descripcion,
                  parameters: t.esquema_json.parameters || t.esquema_json
                }));
                tools[0].functionDeclarations = [
                  ...basicTools,
                  ...adminTools,
                  ...newDynamicDeclarations
                ];
              }
            } catch (err) {
              console.error("Error actualizando catálogo de herramientas dinámicas en bucle:", err.message);
            }

            runLoop = true;
          } else {
            runLoop = false;
          }
        }

        if (responseText) {
          await enviarMensaje(jid, phoneClean, responseText);
        }
        return res.status(200).json({ success: true, responseText });

      } catch (geminiErr) {
        console.error("[whatsapp-incoming] Error chateando con Supervisor:", geminiErr.message, geminiErr.stack);
        await enviarMensaje(jid, phoneClean, "Hola, lo siento, tuve un problema al procesar tu consulta comercial. Intenta de nuevo por favor.");
        return res.status(500).json({ success: false, error: geminiErr.message });
      }
    }

    // --- Procesamiento de Geolocalización ---
    const { location } = req.body;
    if (location && sesion && sesion.reporte_activo_id) {
      const { latitude, longitude } = location;

      // Obtener el reporte diario para sacar el equipo_id
      const { data: reporte } = await supabase
        .from("reportes_diarios")
        .select("equipo_id, equipos(codigo_interno, descripcion_equipo)")
        .eq("id", sesion.reporte_activo_id)
        .maybeSingle();

      if (reporte?.equipo_id) {
        // 1. Actualizar geolocalización del equipo
        const { error: errEq } = await supabase
          .from("equipos")
          .update({
            latitud_actual: latitude,
            longitud_actual: longitude,
            ultima_ubicacion_fecha: new Date().toISOString()
          })
          .eq("id", reporte.equipo_id);

        if (errEq) {
          console.error("[whatsapp-incoming] Error actualizando coordenadas del equipo:", errEq.message);
        } else {
          console.log(`[whatsapp-incoming] Coordenadas del equipo ${reporte.equipos?.codigo_interno} actualizadas: ${latitude}, ${longitude}`);
        }

        // 2. Insertar un hito especial (evento de jornada)
        await supabase
          .from("eventos_jornada")
          .insert({
            reporte_id: sesion.reporte_activo_id,
            estado_hito: "Disponible",
            hora_evento: new Date().toISOString(),
            nota_transcripcion: `📍 Actualización de ubicación GPS: Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`
          });

        await enviarMensaje(jid, phoneClean,
          `📍 *Ubicación Registrada*\n\nCoordenadas de *${reporte.equipos?.descripcion_equipo || "Equipo"}* (${reporte.equipos?.codigo_interno}) actualizadas con éxito.\n(Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)})`
        );
      }

      return res.status(200).json({ success: true, action: "UBICACION_REGISTRADA" });
    }

    // ================================================================
    // CASO A: Sin sesión → Esperar REPORTE:CODIGO O CONSULTA HISTÓRICA
    // ================================================================
    if (!sesion) {
      const msgUpper = (message || "").trim().toUpperCase();

      // Si NO es un escaneo de QR, evaluamos intenciones de consulta histórica antes de rechazar
      if (!msgUpper.startsWith("REPORTE:")) {
        const entradaParaAnalizar = tieneAudioEntrante ? audio : (message || "Audio entrante");
        const intencion = await analizarIntencionHistorica(entradaParaAnalizar);

        if (intencion.es_consulta_pdf && intencion.fecha_solicitada) {
          // Ir a buscar el reporte en la base de datos local
          const { data: reporteHisto } = await supabase
            .from("reportes_diarios")
            .select("pdf_url, fecha")
            .eq("operador_id", personal.id)
            .eq("fecha", intencion.fecha_solicitada)
            .maybeSingle();

          if (reporteHisto?.pdf_url) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://equipos.lukeapp.me";
            await enviarMensaje(jid, phoneClean, 
              `📄 *Reporte Histórico Encontrado*\n\nHola ${personal.nombre_completo}, aquí tienes el PDF de tu jornada del día *${intencion.fecha_solicitada}*:\n👉 ${baseUrl}${reporteHisto.pdf_url}`
            );
          } else {
            await enviarMensaje(jid, phoneClean, 
              `🤷‍♂️ No encontré ningún reporte registrado para ti en la fecha *${intencion.fecha_solicitada}*. Verifica el día e intenta nuevamente.`
            );
          }
          return res.status(200).json({ success: true, action: "CONSULTA_HISTORICA_PROCESADA" });
        }

        // Si no es consulta de PDF, enviamos el saludo instructivo normal de inicio de turno
        await enviarMensaje(jid, phoneClean,
          `👋 Hola *${personal.nombre_completo}*.\n\nPara iniciar tu jornada, escanea el código QR del equipo o escribe:\n\n*REPORTE:CODIGO_EQUIPO*\n\nEjemplo: REPORTE:EIMI00387`
        );
        return res.status(200).json({ success: true });
      }

      const codigoEquipo = msgUpper.replace("REPORTE:", "").trim();

      // Buscar equipo
      const { data: equipo } = await supabase
        .from("equipos")
        .select("*, proyectos(*)")
        .eq("codigo_interno", codigoEquipo)
        .maybeSingle();

      if (!equipo) {
        await enviarMensaje(jid, phoneClean,
          `❌ No encontré el equipo *${codigoEquipo}*.\nVerifica el código e intenta nuevamente.`
        );
        return res.status(200).json({ success: true });
      }

      // Validar si el equipo tiene el seguimiento de jornada deshabilitado
      if (equipo.seguimiento_completo === false) {
        await enviarMensaje(jid, phoneClean,
          `ℹ️ Estimado(a) *${personal.nombre_completo}*.\n\nEl equipo *${equipo.descripcion_equipo}* (${equipo.codigo_interno}) no requiere asignación de operador ni seguimiento de jornada.`
        );
        return res.status(200).json({ success: true, message: "Equipo sin seguimiento completo" });
      }

      // Validar coincidencia de proyecto (proyecto_actual_id)
      if (personal.proyecto_actual_id !== equipo.proyecto_actual_id) {
        let obraPersonalNombre = "Sin asignar";
        if (personal.proyecto_actual_id) {
          const { data: opObra } = await supabase
            .from("proyectos")
            .select("nombre_proyecto")
            .eq("id", personal.proyecto_actual_id)
            .maybeSingle();
          if (opObra) obraPersonalNombre = opObra.nombre_proyecto;
        }
        const obraEquipoNombre = equipo.proyectos ? equipo.proyectos.nombre_proyecto : "Sin asignar";

        await enviarMensaje(jid, phoneClean,
          `❌ *Proyecto No Coincide*\n\nHola *${personal.nombre_completo}*, no puedes registrar tu jornada en el equipo *${equipo.descripcion_equipo}* (${equipo.codigo_interno}) porque pertenece al proyecto *"${obraEquipoNombre}"*, y tú estás asignado al proyecto *"${obraPersonalNombre}"*.\n\nPor favor, contacta a tu supervisor para regularizar tu asignación.`
        );
        return res.status(200).json({ success: true, message: "Proyecto no coincide" });
      }

      // Verificar si ya hay reporte hoy
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: reporteExistente } = await supabase
        .from("reportes_diarios")
        .select("id")
        .eq("equipo_id", equipo.id)
        .eq("operador_id", personal.id)
        .eq("fecha", hoy)
        .maybeSingle();

      if (reporteExistente) {
        // Verificar estado actual de la sesión para no pisar un checkin pendiente
        const { data: sesionExistente } = await supabase
          .from("sesiones_whatsapp")
          .select("id, estado_espera")
          .eq("whatsapp_remitente", phoneClean)
          .maybeSingle();

        if (sesionExistente?.estado_espera === "ESPERANDO_CHECKIN_AUDIO") {
          // Aún no envió el audio de check-in → recordar sin pisar estado
          const { data: eqData } = await supabase
            .from("equipos")
            .select("descripcion_equipo, codigo_interno, tipo_seguimiento")
            .eq("id", equipo.id)
            .maybeSingle();
          const esVehiculo = eqData?.tipo_seguimiento === 'vehiculo';
          const ejemploAudio = esVehiculo
            ? `_"Odómetro 84.320, voy al sector norte"_`
            : `_"Horómetro inicial dos mil trescientos, equipo operativo"_`;
          await enviarMensaje(jid, phoneClean,
            `⏳ *${personal.nombre_completo}*, tienes un check-in pendiente para *${eqData?.descripcion_equipo || equipo.descripcion_equipo}* (${equipo.codigo_interno}).\n\n🎤 Aún no he recibido tu audio de inicio. Por favor envíalo ahora.\nEjemplo: ${ejemploAudio}`
          );
          return res.status(200).json({ success: true, action: "RECORDATORIO_AUDIO_CHECKIN" });
        }

        // Sesión intermedia o sin sesión → reabrir normalmente
        await supabase.from("sesiones_whatsapp").upsert({
          whatsapp_remitente: phoneClean,
          reporte_activo_id: reporteExistente.id,
          estado_espera: "SESION_ABIERTA_INTERMEDIA",
          updated_at: new Date().toISOString(),
        });

        await enviarMensaje(jid, phoneClean,
          `✅ *${personal.nombre_completo}*, ya tienes un reporte abierto para *${equipo.descripcion_equipo}* hoy.\nPuedes continuar enviando audios de actualización o envía el cierre de jornada.`
        );
        return res.status(200).json({ success: true, action: "SESION_REABIERTA" });
      }

      // Crear nuevo reporte (sin horómetro aún)
      const { data: nuevoReporte, error: errReporte } = await supabase
        .from("reportes_diarios")
        .insert({
          equipo_id: equipo.id,
          operador_id: personal.id,
          fecha: hoy,
          horometro_inicio: 0, // Se actualizará con el audio
        })
        .select()
        .single();

      if (errReporte) {
        console.error("[whatsapp-incoming] Error creando reporte:", errReporte.message);
        await enviarMensaje(jid, phoneClean, `❌ Error creando el reporte. Intenta nuevamente.`);
        return res.status(500).json({ success: false });
      }

      // Crear sesión en estado de espera de audio de checkin
      await supabase.from("sesiones_whatsapp").insert({
        whatsapp_remitente: phoneClean,
        reporte_activo_id: nuevoReporte.id,
        estado_espera: "ESPERANDO_CHECKIN_AUDIO",
        updated_at: new Date().toISOString(),
      });

      // Construir mensaje con pauta preventiva si existe
      let mensajePauta = "";
      if (equipo.pauta_preventiva_activa) {
        mensajePauta = `\n\n📋 *Instrucción del Jefe de Área para hoy:*\n_${equipo.pauta_preventiva_activa}_`;
      }

      // Adaptar mensaje de instrucción según tipo de equipo
      const tipoSeguimientoEquipo = equipo.tipo_seguimiento || 'estandar';
      let mensajeInstruccion;
      if (tipoSeguimientoEquipo === 'vehiculo') {
        mensajeInstruccion = `🚗 *${personal.nombre_completo}*, vehículo registrado:\n*${equipo.descripcion_equipo}* (${equipo.codigo_interno})${equipo.proyectos ? `\n📍 Proyecto: ${equipo.proyectos.nombre_proyecto}` : ""}${mensajePauta}\n\n💬 Indica el *kilometraje (odómetro)* y tu destino por *audio o texto*.\n_Ejemplo: "Odómetro 84.320, voy al sector norte"_`;
      } else if (tipoSeguimientoEquipo === 'camion') {
        mensajeInstruccion = `🚛 *${personal.nombre_completo}*, inicio de turno para:\n*${equipo.descripcion_equipo}* (${equipo.codigo_interno})${equipo.proyectos ? `\n📍 Proyecto: ${equipo.proyectos.nombre_proyecto}` : ""}${mensajePauta}\n\n💬 Indica tu *horómetro inicial* y el estado del camión por *audio o texto*.\n_Ejemplo: "Horómetro 15.200, camión operativo"_`;
      } else {
        mensajeInstruccion = `🚜 *${personal.nombre_completo}*, tu inicio de turno para:\n*${equipo.descripcion_equipo}* (${equipo.codigo_interno})${equipo.proyectos ? `\n📍 Proyecto: ${equipo.proyectos.nombre_proyecto}` : ""}${mensajePauta}\n\n💬 Indica tu *horómetro inicial* y el estado del equipo por *audio o texto*.\n_Ejemplo: "Horómetro 2.300, equipo operativo, trabajando con Piping"_`;
      }

      await enviarMensaje(jid, phoneClean, mensajeInstruccion);

      return res.status(200).json({ success: true, action: "SESION_CREADA" });
    }

    // ================================================================
    // CASO B: Sesión ESPERANDO_CHECKIN_AUDIO (acepta audio O texto)
    // ================================================================
    if (sesion.estado_espera === "ESPERANDO_CHECKIN_AUDIO") {
      // Obtener tipo_seguimiento del equipo desde el reporte activo
      const { data: reporteCheckin } = await supabase
        .from("reportes_diarios")
        .select("*, equipos(*)")
        .eq("id", sesion.reporte_activo_id)
        .maybeSingle();
      const tipoSeguimiento = reporteCheckin?.equipos?.tipo_seguimiento || 'estandar';
      const seguimientoCompleto = reporteCheckin?.equipos?.seguimiento_completo !== false;
      const nombreEquipo = reporteCheckin?.equipos?.descripcion_equipo || "el equipo";
      const codigoEquipo = reporteCheckin?.equipos?.codigo_interno || "";

      // Aceptar audio O texto — si no viene ninguno, recordar
      const tieneEntrada = !!audio || !!(message && message.trim().length > 1);
      if (!tieneEntrada) {
        const ejemploTexto = tipoSeguimiento === 'vehiculo'
          ? `_"Odómetro 84.320, voy al sector norte"_`
          : `_"Horómetro 2300, equipo operativo"_`;
        await enviarMensaje(jid, phoneClean,
          `⏳ *${personal.nombre_completo}*, tu check-in para *${nombreEquipo}* (${codigoEquipo}) está pendiente.\n\n💬 Envía un *audio* o *texto* para registrarlo.\nEjemplo: ${ejemploTexto}`
        );
        return res.status(200).json({ success: true, action: "ESPERANDO_ENTRADA" });
      }

      let resultado;

      // ── FLUJO VEHÍCULO (camioneta, furgón, minibús) ──────────────────
      if (tipoSeguimiento === 'vehiculo') {
        console.log("[whatsapp-incoming] 🚗 Procesando check-in VEHÍCULO");

        if (audio) {
          resultado = await procesarAudioVehiculo(
            audio.data, audio.mimeType,
            { estado_sesion: "CHECKIN", km_inicio: null }
          );
        } else {
          resultado = await procesarTextoVehiculo(
            message.trim(),
            { estado_sesion: "CHECKIN", km_inicio: null }
          );
        }

        console.log("[whatsapp-incoming] Gemini vehiculo checkin:", JSON.stringify(resultado));

        const kmInicial = resultado.km_inicial || null;
        const destinoRuta = resultado.destino_ruta || null;
        const confirmacionBot = resultado.mensaje_conversacional_bot
          || `✅ *Vehículo registrado.*${kmInicial ? `\n🔢 Odómetro inicial: *${kmInicial.toLocaleString("es-CL")} km*` : ""}${destinoRuta ? `\n📍 Destino: *${destinoRuta}*` : ""}\n\nEnvía un audio o texto al finalizar para registrar el odómetro final.`;

        const tipoEntrada = audio ? "audio" : "texto";
        await guardarMensajeChat(supabase, phoneClean, "user", `Check-in vehículo: odómetro ${kmInicial}, destino ${destinoRuta}`, tipoEntrada, sesion.reporte_activo_id);
        await guardarMensajeChat(supabase, phoneClean, "model", confirmacionBot, "texto", sesion.reporte_activo_id);

        await supabase.from("reportes_diarios")
          .update({ km_inicial: kmInicial, destino_ruta: destinoRuta })
          .eq("id", sesion.reporte_activo_id);

        await supabase.from("eventos_jornada").insert({
          reporte_id: sesion.reporte_activo_id,
          estado_hito: "Disponible",
          hora_evento: new Date().toISOString(),
          nota_transcripcion: `CHECK-IN VEHÍCULO [${tipoEntrada}]: ${resultado.detalles_texto || "Inicio de uso"} | Odómetro: ${kmInicial} | Destino: ${destinoRuta}`,
        });

        await supabase.from("sesiones_whatsapp")
          .update({ estado_espera: "SESION_ABIERTA_INTERMEDIA", updated_at: new Date().toISOString() })
          .eq("id", sesion.id);

        await enviarMensaje(jid, phoneClean, confirmacionBot);
        return res.status(200).json({ success: true, action: "CHECKIN_VEHICULO_REGISTRADO" });
      }

      // ── FLUJO ESTÁNDAR y CAMIÓN (horómetro, acepta audio O texto) ───
      const { data: especialidades } = await supabase.from("especialidades").select("*");
      const tipoEntradaLog = audio ? "audio" : "texto";
      const transcripcionEntrada = audio
        ? (tipoSeguimiento === 'camion' ? `Audio check-in: horómetro inicial del camión.` : `Audio check-in: horómetro inicial del operador.`)
        : message.trim();

      await guardarMensajeChat(supabase, phoneClean, "user", transcripcionEntrada, tipoEntradaLog, sesion.reporte_activo_id);
      const historial = await cargarHistorialGemini(supabase, phoneClean);

      const contextoCheckin = {
        estado_sesion: "CHECKIN",
        seguimiento_completo: seguimientoCompleto,
        tipo_seguimiento: tipoSeguimiento,
      };

      if (audio) {
        // Con audio: usar historial con inlineData o fallback REST
        if (historial.length > 0) {
          const historialConAudio = [
            ...historial.slice(0, -1),
            {
              role: "user",
              parts: [
                { text: transcripcionEntrada },
                { inlineData: { mimeType: audio.mimeType || "audio/ogg", data: audio.data } }
              ]
            }
          ];
          resultado = await procesarMensajeConContexto(historialConAudio, especialidades || [], contextoCheckin);
        } else {
          resultado = await procesarAudioOperador(audio.data, audio.mimeType, especialidades || [], contextoCheckin);
        }
      } else {
        // Con texto: pasar directamente en el historial
        const historialConTexto = [
          ...historial.slice(0, -1),
          { role: "user", parts: [{ text: transcripcionEntrada }] }
        ];
        resultado = await procesarMensajeConContexto(
          historialConTexto.length > 0 ? historialConTexto : [{ role: "user", parts: [{ text: transcripcionEntrada }] }],
          especialidades || [],
          contextoCheckin
        );
      }

      console.log(`[whatsapp-incoming] Gemini checkin [${tipoEntradaLog}]:`, JSON.stringify(resultado));

      const horometroInicio = resultado.horometro_inicial || 0;
      const confirmacionBotEst = resultado.mensaje_conversacional_bot
        || `✅ *Check-in registrado.*\n⏱ Horómetro inicial: *${horometroInicio.toLocaleString("es-CL")} hrs*\n\nDurante la jornada envía audios o mensajes cuando cambies de actividad.\nAl cerrar di: *"Cierre de jornada, horómetro final XXXX"*`;

      await guardarMensajeChat(supabase, phoneClean, "model", confirmacionBotEst, "texto", sesion.reporte_activo_id);

      await supabase.from("reportes_diarios")
        .update({ horometro_inicio: horometroInicio })
        .eq("id", sesion.reporte_activo_id);

      const estadoInicialDinamico = (resultado.tipo_evento && resultado.tipo_evento !== "CHECKIN")
        ? resultado.tipo_evento : "Disponible";

      await supabase.from("eventos_jornada").insert({
        reporte_id: sesion.reporte_activo_id,
        estado_hito: estadoInicialDinamico,
        especialidad_id: resultado.especialidad_id || null,
        hora_evento: new Date().toISOString(),
        nota_transcripcion: `CHECK-IN [${tipoEntradaLog}]: ${resultado.detalles_texto || transcripcionEntrada}`,
      });

      await supabase.from("sesiones_whatsapp")
        .update({ estado_espera: "SESION_ABIERTA_INTERMEDIA", updated_at: new Date().toISOString() })
        .eq("id", sesion.id);

      await enviarMensaje(jid, phoneClean, confirmacionBotEst);
      return res.status(200).json({ success: true, action: "CHECKIN_REGISTRADO" });
    }

    // ================================================================
    // CASO C: Sesión SESION_ABIERTA_INTERMEDIA
    // ================================================================
    if (
      sesion.estado_espera === "SESION_ABIERTA_INTERMEDIA" ||
      sesion.estado_espera === "ESPERANDO_CHECKOUT_AUDIO"
    ) {
      // Guard: si envía REPORTE:CODIGO con sesión activa → avisar y bloquear
      // (no dejar que Gemini lo procese como hito de texto)
      const msgUpperC = (message || "").trim().toUpperCase();
      if (msgUpperC.startsWith("REPORTE:")) {
        const { data: reporteActivo } = await supabase
          .from("reportes_diarios")
          .select("*, equipos(descripcion_equipo, codigo_interno)")
          .eq("id", sesion.reporte_activo_id)
          .maybeSingle();
        const equipoActivo = reporteActivo?.equipos;
        await enviarMensaje(jid, phoneClean,
          `⚠️ *${personal.nombre_completo}*, ya tienes una jornada activa para:\n*${equipoActivo?.descripcion_equipo || "equipo"}* (${equipoActivo?.codigo_interno || ""})\n\nPara cambiar de equipo, primero cierra tu jornada actual diciendo:\n_"Cierre de jornada, horómetro final XXXX"_`
        );
        return res.status(200).json({ success: true, action: "SESION_YA_ACTIVA" });
      }

      // --- Manejo de IMAGEN → Supabase Storage ---
      if (image && !audio) {
        const { data: equipoData } = await supabase
          .from("equipos")
          .select("descripcion_equipo, codigo_interno")
          .eq("id", sesion.reportes_diarios?.equipo_id)
          .maybeSingle();

        // 1. Subir imagen a Supabase Storage
        const storagePath = await uploadImagenStorage(supabase, image.data, image.mimeType);

        // 2. Analizar con Gemini Vision (desde base64 en memoria)
        const { analisis, esCritico } = await analizarImagenEvidencia(
          image.data,
          image.mimeType,
          equipoData?.descripcion_equipo
        );

        // 3. Guardar evidencia en DB con el storage path
        await supabase.from("evidencias").insert({
          reporte_id: sesion.reporte_activo_id,
          local_storage_path: storagePath || "upload-error",
          descripcion_analisis_ia: analisis,
        });

        // Si es crítica, forzar falla y notificar supervisor
        if (esCritico) {
          await supabase.from("eventos_jornada").insert({
            reporte_id: sesion.reporte_activo_id,
            estado_hito: "Detenido por Falla",
            hora_evento: new Date().toISOString(),
            nota_transcripcion: `FALLA DETECTADA POR IA: ${analisis.slice(0, 200)}`,
          });

          // Notificar supervisor
          const { data: reporte } = await supabase
            .from("reportes_diarios")
            .select("supervisor_id, equipos(codigo_interno, descripcion_equipo)")
            .eq("id", sesion.reporte_activo_id)
            .maybeSingle();

          if (reporte?.supervisor_id) {
            await notificarSupervisor(
              supabase,
              reporte.supervisor_id,
              `🔴 Equipo ${reporte.equipos?.codigo_interno} - ${reporte.equipos?.descripcion_equipo}\nOperador: ${personal.nombre_completo}\n\nAnálisis IA: ${analisis}`
            );
          }

          await enviarMensaje(jid, phoneClean,
            `🚨 *ALERTA CRÍTICA DETECTADA*\n\nAnálisis IA:\n_${analisis}_\n\nSe ha notificado automáticamente a tu supervisor. Equipo marcado como *Detenido por Falla*.`
          );
        } else {
          await enviarMensaje(jid, phoneClean,
            `📷 Evidencia registrada.\n\n🔍 *Análisis IA:*\n_${analisis}_`
          );
        }

        return res.status(200).json({ success: true, action: "EVIDENCIA_REGISTRADA" });
      }

      // --- Manejo de AUDIO ---
      if (!audio && !message) {
        return res.status(200).json({ success: true });
      }

      const { data: especialidades } = await supabase.from("especialidades").select("*");
      const { data: reporteActual } = await supabase
        .from("reportes_diarios")
        .select("horometro_inicio, km_inicial, equipos(pauta_preventiva_activa, seguimiento_completo, tipo_seguimiento)")
        .eq("id", sesion.reporte_activo_id)
        .maybeSingle();

      const seguimientoCompleto = reporteActual?.equipos?.seguimiento_completo !== false;
      const tipoSeguimiento = reporteActual?.equipos?.tipo_seguimiento || 'estandar';

      // === MEMORIA CONVERSACIONAL (Caso C: Hitos Intermedios) ===
      const contenidoUsuario = audio ? "Audio de terreno del operador" : (message || "");
      const tipoMsgC = audio ? "audio" : "texto";

      // A. Guardar mensaje entrante
      await guardarMensajeChat(supabase, phoneClean, "user", contenidoUsuario, tipoMsgC, sesion.reporte_activo_id);

      // B. Cargar contexto de los últimos 6 mensajes
      const historialC = await cargarHistorialGemini(supabase, phoneClean);

      let resultado;
      if (tipoSeguimiento === 'vehiculo') {
        if (audio) {
          resultado = await procesarAudioVehiculo(
            audio.data, audio.mimeType,
            { estado_sesion: "INTERMEDIO", km_inicio: reporteActual?.km_inicial }
          );
        } else {
          resultado = await procesarTextoVehiculo(
            message.trim(),
            { estado_sesion: "INTERMEDIO", km_inicio: reporteActual?.km_inicial }
          );
        }
      } else {
        if (audio) {
          if (historialC.length > 0) {
            // Reemplazar el último mensaje del historial con audio real
            const historialConAudio = [
              ...historialC.slice(0, -1),
              {
                role: "user",
                parts: [
                  { text: contenidoUsuario },
                  { inlineData: { mimeType: audio.mimeType || "audio/ogg", data: audio.data } }
                ]
              }
            ];
            resultado = await procesarMensajeConContexto(
              historialConAudio,
              especialidades || [],
              {
                estado_sesion: "INTERMEDIO",
                horometro_inicio: reporteActual?.horometro_inicio,
                pauta_del_dia: reporteActual?.equipos?.pauta_preventiva_activa,
                seguimiento_completo: seguimientoCompleto
              }
            );
          } else {
            resultado = await procesarAudioOperador(
              audio.data, audio.mimeType, especialidades || [],
              {
                estado_sesion: "INTERMEDIO",
                horometro_inicio: reporteActual?.horometro_inicio,
                seguimiento_completo: seguimientoCompleto
              }
            );
          }
        } else {
          // Procesar texto como fallback
          resultado = {
            tipo_evento: "Trabajando",
            especialidad_id: null,
            detalles_texto: message,
            horometro_final: null,
            petroleo_litros: null,
            mensaje_conversacional_bot: null,
          };
        }
      }

      console.log("[whatsapp-incoming] Gemini hito:", JSON.stringify(resultado));

      // ¿Es cierre de jornada?
      const esCierre =
        resultado.tipo_evento === "CIERRE" ||
        resultado.horometro_final !== null ||
        resultado.km_final !== null;

      if (esCierre) {
        // === CIERRE DE JORNADA ===
        const horometroFinal = resultado.horometro_final;
        const kmFinal = resultado.km_final;

        // Actualizar reporte con datos de cierre
        const updateData = { estado_final: "Equipo Operativo" };
        if (horometroFinal) updateData.horometro_final = horometroFinal;
        if (kmFinal) updateData.km_final = kmFinal;
        if (resultado.petroleo_litros) updateData.petroleo_litros = resultado.petroleo_litros;
        if (resultado.horometro_carga_combustible)
          updateData.horometro_carga_combustible = resultado.horometro_carga_combustible;

        await supabase
          .from("reportes_diarios")
          .update(updateData)
          .eq("id", sesion.reporte_activo_id);

        // Evento de cierre
        await supabase.from("eventos_jornada").insert({
          reporte_id: sesion.reporte_activo_id,
          estado_hito: "Disponible",
          hora_evento: new Date().toISOString(),
          nota_transcripcion: `CHECK-OUT: ${resultado.detalles_texto || "Cierre de jornada"}${kmFinal ? ` | Odómetro: ${kmFinal}` : ""}`,
        });

        await enviarMensaje(jid, phoneClean,
          `⏳ *Consolidando tu reporte diario...*\nGenerando PDF con todos los hitos del día.`
        );

        // Responder de inmediato al webhook para evitar timeouts
        res.status(200).json({ success: true, action: "CHECKOUT_PROCESANDO" });

        // Procesar la compilación del PDF en segundo plano (asíncronamente)
        (async () => {
          try {
            const { data: reporteCompleto } = await supabase
              .from("reportes_diarios")
              .select("*")
              .eq("id", sesion.reporte_activo_id)
              .single();

            const { data: equipo } = await supabase
              .from("equipos")
              .select("*")
              .eq("id", reporteCompleto.equipo_id)
              .single();

            const supervisor = reporteCompleto.supervisor_id
              ? (await supabase.from("personal").select("nombre_completo").eq("id", reporteCompleto.supervisor_id).maybeSingle()).data
              : null;

            const { data: eventosRaw } = await supabase
              .from("eventos_jornada")
              .select("*, especialidades(nombre_oficial)")
              .eq("reporte_id", sesion.reporte_activo_id)
              .order("hora_evento", { ascending: true });

            const eventos = (eventosRaw || []).map(e => ({
              ...e,
              especialidad_nombre: e.especialidades?.nombre_oficial,
            }));

            const { data: evidencias } = await supabase
              .from("evidencias")
              .select("*")
              .eq("reporte_id", sesion.reporte_activo_id);

            const pdfUrl = await generarReportePDF({
              reporte: reporteCompleto,
              equipo,
              operador: personal,
              supervisor,
              eventos,
              evidencias: evidencias || [],
            });

            // Guardar URL del PDF
            await supabase
              .from("reportes_diarios")
              .update({ pdf_url: pdfUrl })
              .eq("id", sesion.reporte_activo_id);

            // Cerrar sesión
            await supabase
              .from("sesiones_whatsapp")
              .delete()
              .eq("id", sesion.id);

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://equipos.lukeapp.me";
            if (equipo?.tipo_seguimiento === 'vehiculo') {
              const kmFinalCalculado = kmFinal || reporteCompleto.km_final;
              const kmRecorridos = kmFinalCalculado && reporteCompleto.km_inicial ? (kmFinalCalculado - reporteCompleto.km_inicial) : null;
              await enviarMensaje(jid, phoneClean,
                `✅ *Reporte Diario de Jornada consolidado con éxito.*\n\n🚗 Odómetro: ${reporteCompleto.km_inicial?.toLocaleString("es-CL") || "—"} → ${kmFinalCalculado?.toLocaleString("es-CL") || "—"} km\n${kmRecorridos !== null ? `⏱ Kilómetros recorridos: ${kmRecorridos.toLocaleString("es-CL")} km\n` : ""}\n📄 Descarga tu reporte aquí:\n👉 ${baseUrl}${pdfUrl}\n\n¡Buen término de jornada, ${personal.nombre_completo}! 👷‍♂️`
              );
            } else {
              await enviarMensaje(jid, phoneClean,
                `✅ *Reporte Diario de Jornada consolidado con éxito.*\n\n📊 Horómetro: ${reporteCompleto.horometro_inicio} → ${horometroFinal || "—"} hrs\n${horometroFinal ? `⏱ Horas trabajadas: ${(horometroFinal - reporteCompleto.horometro_inicio).toFixed(1)} hrs\n` : ""}\n📄 Descarga tu reporte aquí:\n👉 ${baseUrl}${pdfUrl}\n\n¡Buen término de jornada, ${personal.nombre_completo}! 👷‍♂️`
              );
            }
          } catch (pdfErr) {
            console.error("[whatsapp-incoming] Error generando PDF en segundo plano:", pdfErr.message);
            await supabase.from("sesiones_whatsapp").delete().eq("id", sesion.id);
            await enviarMensaje(jid, phoneClean,
              `✅ Jornada cerrada correctamente. Hubo un problema generando el PDF, pero tus datos están guardados. Contacta a tu supervisor.`
            );
          }
        })().catch(err => {
          console.error("[whatsapp-incoming] Error crítico en ejecución asíncrona de PDF:", err.message);
        });

        return;
      }

      // === HITO INTERMEDIO ===
      const estadoHito =
        resultado.tipo_evento === "CHECKIN" ? "Disponible" : resultado.tipo_evento || "Trabajando";

      await supabase.from("eventos_jornada").insert({
        reporte_id: sesion.reporte_activo_id,
        estado_hito: estadoHito,
        especialidad_id: resultado.especialidad_id || null,
        hora_evento: new Date().toISOString(),
        nota_transcripcion: resultado.detalles_texto || "",
      });

      // Actualizar combustible si se mencionó
      if (resultado.petroleo_litros || resultado.horometro_carga_combustible) {
        await supabase
          .from("reportes_diarios")
          .update({
            ...(resultado.petroleo_litros && { petroleo_litros: resultado.petroleo_litros }),
            ...(resultado.horometro_carga_combustible && {
              horometro_carga_combustible: resultado.horometro_carga_combustible,
            }),
          })
          .eq("id", sesion.reporte_activo_id);
      }

      const iconosEstado = {
        Trabajando: "🟢",
        Disponible: "🔵",
        "En Colacion": "🟡",
        "Detenido por Falla": "🔴",
      };

      // Si es un hito de trabajo, concatenamos la especialidad oficial que leyó de la tabla maestra
      const tagEspecialidad = resultado.especialidad_detectada ? ` — *${resultado.especialidad_detectada}*` : "";
      
      const confirmacion = resultado.mensaje_conversacional_bot
        || `${iconosEstado[estadoHito] || "⚪"} *Estado Actualizado: ${estadoHito}*${tagEspecialidad}\n\n📝 _"${resultado.detalles_texto || "Hito registrado con éxito."}"_`;

      // Guardar respuesta del bot en historial de chat
      await guardarMensajeChat(supabase, phoneClean, "model", confirmacion, "texto", sesion.reporte_activo_id);

      await enviarMensaje(jid, phoneClean, confirmacion);

      // Alerta si es falla
      if (estadoHito === "Detenido por Falla" || resultado.es_falla_critica) {
        const { data: rpt } = await supabase
          .from("reportes_diarios")
          .select("supervisor_id, equipos(codigo_interno)")
          .eq("id", sesion.reporte_activo_id)
          .maybeSingle();

        if (rpt?.supervisor_id) {
          await notificarSupervisor(
            supabase,
            rpt.supervisor_id,
            `🔴 Equipo ${rpt.equipos?.codigo_interno}\nOperador: ${personal.nombre_completo}\n\nFalla reportada: ${resultado.detalles_texto}`
          );
        }
      }

      return res.status(200).json({ success: true, action: "HITO_REGISTRADO" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[whatsapp-incoming] Error general:", err.message, err.stack);
    return res.status(500).json({ success: false, error: err.message });
  }
}
