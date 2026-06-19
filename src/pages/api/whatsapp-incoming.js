import { createAdminClient } from "../../lib/supabase-server";
import { procesarAudioOperador, analizarImagenEvidencia } from "../../lib/gemini";
import { generarReportePDF } from "../../lib/pdf-generator";
import crypto from "crypto";

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
  const phoneClean = (senderPn || phone || "").replace(/\+/g, "").trim();

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
      .select("*")
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
      // Regex para validar formato: REGISTRO: Nombre - Rol - RUT
      const regexRegistro = /^REGISTRO\s*:\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/i;
      const match = msgText.match(regexRegistro);

      if (match) {
        const nombre = match[1].trim();
        const rolRaw = match[2].trim();
        const rut = match[3].trim();

        // Validar Rol
        const rolesValidos = ["Operador", "Supervisor", "Rigger", "Jefe de Area"];
        // Normalizar rol para comparar
        const rolNorm = rolesValidos.find(
          r => r.toLowerCase().replace(/\s/g, "") === rolRaw.toLowerCase().replace(/\s/g, "")
        );

        if (!rolNorm) {
          await enviarMensaje(jid, phoneClean,
            `❌ El rol *"${rolRaw}"* no es válido.\n\nRoles permitidos:\n• *Operador*\n• *Supervisor*\n• *Rigger*\n• *Jefe de Area*\n\nPor favor envía la solicitud nuevamente.`
          );
          return res.status(200).json({ success: true });
        }

        // Guardar o actualizar en registros_pendientes
        const { error: errUpsert } = await supabase
          .from("registros_pendientes")
          .upsert({
            whatsapp: phoneClean,
            nombre_completo: nombre,
            rol_solicitado: rolNorm,
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
          `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${nombre}\n• *Rol:* ${rolNorm}\n• *RUT:* ${rut}\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias!`
        );
        return res.status(200).json({ success: true, action: "SOLICITUD_CREADA" });
      }

      // Si no coincide con el formato REGISTRO:
      if (!registroPendiente) {
        await enviarMensaje(jid, phoneClean,
          `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\nVeo que tu número no está registrado en el sistema. Para enviar tu solicitud de registro al Administrador, por favor responde con el siguiente formato:\n\n*REGISTRO: Tu Nombre Completo - Rol Solicitado - Tu RUT*\n\n*Roles disponibles:*\n• Operador\n• Supervisor\n• Rigger\n• Jefe de Area\n\n*Ejemplo:*\n_REGISTRO: Juan Pérez - Operador - 18.765.432-1_`
        );
        return res.status(200).json({ success: true, message: "Instrucciones de registro enviadas" });
      } else if (registroPendiente.estado === "pendiente") {
        await enviarMensaje(jid, phoneClean,
          `⏳ *Tu solicitud sigue pendiente*\n\nHola *${registroPendiente.nombre_completo}*, tu solicitud de registro como *${registroPendiente.rol_solicitado}* está siendo revisada por un Administrador.\n\nTe notificaremos por este medio inmediatamente después de ser aprobada.`
        );
        return res.status(200).json({ success: true, message: "Solicitud pendiente" });
      } else if (registroPendiente.estado === "rechazado") {
        await enviarMensaje(jid, phoneClean,
          `❌ *Solicitud Anterior Rechazada*\n\nTu solicitud de registro como *${registroPendiente.rol_solicitado}* fue rechazada.\n\n*Motivo:* ${registroPendiente.nota_rechazo || "No especificado."}\n\nSi deseas volver a solicitar el registro con datos correctos, envía:\n\n*REGISTRO: Tu Nombre Completo - Rol Solicitado - Tu RUT*`
        );
        return res.status(200).json({ success: true, message: "Solicitud rechazada previamente" });
      }

      return res.status(200).json({ success: true, message: "No registrado" });
    }

    // ================================================================
    // 2. BUSCAR SESIÓN ACTIVA
    // ================================================================
    const { data: sesion } = await supabase
      .from("sesiones_whatsapp")
      .select("*, reportes_diarios(*)")
      .eq("whatsapp_remitente", phoneClean)
      .maybeSingle();

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
    // CASO A: Sin sesión → Esperar REPORTE:CODIGO
    // ================================================================
    if (!sesion) {
      const msgUpper = (message || "").trim().toUpperCase();

      if (!msgUpper.startsWith("REPORTE:")) {
        await enviarMensaje(jid, phoneClean,
          `👋 Hola *${personal.nombre_completo}*.\n\nPara iniciar tu jornada, escanea el código QR del equipo o escribe:\n\n*REPORTE:CODIGO_EQUIPO*\n\nEjemplo: REPORTE:EIMI00387`
        );
        return res.status(200).json({ success: true });
      }

      const codigoEquipo = msgUpper.replace("REPORTE:", "").trim();

      // Buscar equipo
      const { data: equipo } = await supabase
        .from("equipos")
        .select("*, obras(*)")
        .eq("codigo_interno", codigoEquipo)
        .maybeSingle();

      if (!equipo) {
        await enviarMensaje(jid, phoneClean,
          `❌ No encontré el equipo *${codigoEquipo}*.\nVerifica el código e intenta nuevamente.`
        );
        return res.status(200).json({ success: true });
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
        // Reabrir sesión si existía reporte pero no sesión
        await supabase.from("sesiones_whatsapp").upsert({
          whatsapp_remitente: phoneClean,
          reporte_activo_id: reporteExistente.id,
          estado_espera: "SESION_ABIERTA_INTERMEDIA",
          updated_at: new Date().toISOString(),
        });

        await enviarMensaje(jid, phoneClean,
          `✅ *${personal.nombre_completo}*, ya tienes un reporte abierto para *${equipo.descripcion_equipo}* hoy.\nPuedes continuar enviando audios de actualización o envía el cierre de jornada.`
        );
        return res.status(200).json({ success: true });
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

      await enviarMensaje(jid, phoneClean,
        `🚜 *${personal.nombre_completo}*, tu inicio de turno para:\n*${equipo.descripcion_equipo}* (${equipo.codigo_interno})${equipo.obras ? `\n📍 Proyecto: ${equipo.obras.nombre_obra}` : ""}${mensajePauta}\n\n📻 Por favor envía un *audio* indicando tu *horómetro inicial* y confirmando el estado del equipo.`
      );

      return res.status(200).json({ success: true, action: "SESION_CREADA" });
    }

    // ================================================================
    // CASO B: Sesión ESPERANDO_CHECKIN_AUDIO
    // ================================================================
    if (sesion.estado_espera === "ESPERANDO_CHECKIN_AUDIO") {
      if (!audio) {
        await enviarMensaje(jid, phoneClean,
          `🎤 Necesito que envíes un *audio* con tu horómetro inicial para registrar el check-in.\nEjemplo: _"Horómetro inicial dos mil trescientos, equipo operativo"_`
        );
        return res.status(200).json({ success: true });
      }

      // Obtener especialidades para el prompt
      const { data: especialidades } = await supabase.from("especialidades").select("*");

      // Procesar audio con Gemini
      const resultado = await procesarAudioOperador(
        audio.data, audio.mimeType, especialidades || [],
        { estado_sesion: "CHECKIN" }
      );

      console.log("[whatsapp-incoming] Gemini checkin:", JSON.stringify(resultado));

      const horometroInicio = resultado.horometro_inicial || 0;

      // Actualizar horómetro inicial en el reporte
      await supabase
        .from("reportes_diarios")
        .update({ horometro_inicio: horometroInicio })
        .eq("id", sesion.reporte_activo_id);

      // Insertar primer evento de jornada
      const especialidadId = resultado.especialidad_id || null;
      await supabase.from("eventos_jornada").insert({
        reporte_id: sesion.reporte_activo_id,
        estado_hito: "Disponible",
        especialidad_id: especialidadId,
        hora_evento: new Date().toISOString(),
        nota_transcripcion: `CHECK-IN: ${resultado.detalles_texto || "Inicio de jornada"}`,
      });

      // Avanzar sesión
      await supabase
        .from("sesiones_whatsapp")
        .update({
          estado_espera: "SESION_ABIERTA_INTERMEDIA",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sesion.id);

      await enviarMensaje(jid, phoneClean,
        `✅ *Check-in registrado con éxito.*\n⏱ Horómetro inicial: *${horometroInicio.toLocaleString("es-CL")} hrs*\n\nDurante la jornada, envía audios cuando cambies de actividad:\n• _"Empezamos a trabajar con los cañoneros de Piping"_\n• _"Voy a colación"_\n• _"Máquina disponible, esperando"_\n\nAl cerrar el turno di: *"Cierre de jornada, horómetro final XXXX"*`
      );

      return res.status(200).json({ success: true, action: "CHECKIN_REGISTRADO" });
    }

    // ================================================================
    // CASO C: Sesión SESION_ABIERTA_INTERMEDIA
    // ================================================================
    if (
      sesion.estado_espera === "SESION_ABIERTA_INTERMEDIA" ||
      sesion.estado_espera === "ESPERANDO_CHECKOUT_AUDIO"
    ) {
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
        .select("horometro_inicio")
        .eq("id", sesion.reporte_activo_id)
        .maybeSingle();

      let resultado;
      if (audio) {
        resultado = await procesarAudioOperador(
          audio.data, audio.mimeType, especialidades || [],
          {
            estado_sesion: "INTERMEDIO",
            horometro_inicio: reporteActual?.horometro_inicio,
          }
        );
      } else {
        // Procesar texto como fallback
        resultado = {
          tipo_evento: "Trabajando",
          especialidad_id: null,
          detalles_texto: message,
          horometro_final: null,
          petroleo_litros: null,
        };
      }

      console.log("[whatsapp-incoming] Gemini hito:", JSON.stringify(resultado));

      // ¿Es cierre de jornada?
      const esCierre =
        resultado.tipo_evento === "CIERRE" ||
        resultado.horometro_final !== null;

      if (esCierre) {
        // === CIERRE DE JORNADA ===
        const horometroFinal = resultado.horometro_final;

        // Actualizar reporte con datos de cierre
        const updateData = { estado_final: "Equipo Operativo" };
        if (horometroFinal) updateData.horometro_final = horometroFinal;
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
          nota_transcripcion: `CHECK-OUT: ${resultado.detalles_texto || "Cierre de jornada"}`,
        });

        await enviarMensaje(jid, phoneClean,
          `⏳ *Consolidando tu reporte diario...*\nGenerando PDF con todos los hitos del día.`
        );

        // Generar PDF
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
          await enviarMensaje(jid, phoneClean,
            `✅ *Reporte Diario de Jornada consolidado con éxito.*\n\n📊 Horómetro: ${reporteCompleto.horometro_inicio} → ${horometroFinal || "—"} hrs\n${horometroFinal ? `⏱ Horas trabajadas: ${(horometroFinal - reporteCompleto.horometro_inicio).toFixed(1)} hrs\n` : ""}\n📄 Descarga tu reporte aquí:\n👉 ${baseUrl}${pdfUrl}\n\n¡Buen término de jornada, ${personal.nombre_completo}! 👷‍♂️`
          );
        } catch (pdfErr) {
          console.error("[whatsapp-incoming] Error generando PDF:", pdfErr.message);
          await supabase.from("sesiones_whatsapp").delete().eq("id", sesion.id);
          await enviarMensaje(jid, phoneClean,
            `✅ Jornada cerrada correctamente. Hubo un problema generando el PDF, pero tus datos están guardados. Contacta a tu supervisor.`
          );
        }

        return res.status(200).json({ success: true, action: "CHECKOUT_REGISTRADO" });
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

      const confirmacion = `${iconosEstado[estadoHito] || "⚪"} *${estadoHito}*${resultado.especialidad_detectada ? ` — ${resultado.especialidad_detectada}` : ""}\n\n_${resultado.detalles_texto || "Hito registrado."}_`;

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
