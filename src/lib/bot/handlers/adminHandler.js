import { enviarMensajeWhatsApp, guardarMensajeChat, cargarHistorialGemini } from "../services/messageService";

export async function handleAdminFlow(ctx, res) {
  const { supabase, personal, phoneClean, jid, message, audio, geminiKey } = ctx;

  console.log(`[adminHandler] 👑 Interacción de Administrador/Supervisor (${personal.nombre_completo})`);

  // 1. Cargar herramientas dinámicas desde Supabase (esquema maquinaria)
  let dbTools = [];
  try {
    const { data: loadedTools } = await supabase
      .from("bot_tools_dinamicas")
      .select("nombre_funcion, descripcion, esquema_json, codigo_javascript");
    if (loadedTools) dbTools = loadedTools;
  } catch (err) {
    console.error("[adminHandler] Error cargando herramientas dinámicas:", err.message);
  }

  // 2. Definir esquemas de herramientas básicas
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
      ultima_ubicacion_fecha: "TIMESTAMP",
      combustible_nivel_porcentaje: "NUMERIC",
      clasificacion_comercial: "TEXT",
      arriendo_cliente: "TEXT",
      arriendo_fecha_inicio: "DATE",
      arriendo_fecha_fin: "DATE"
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
   - **NIVEL DE COMBUSTIBLE:** La columna 'combustible_nivel_porcentaje' (NUMERIC) en la tabla 'equipos' almacena el porcentaje de combustible del estanque (ej: 100, 80, 50, etc.). Si el supervisor te solicita registrar, actualizar o cambiar el nivel de combustible de un equipo (ej. 'Actualiza el combustible de caal-0002 esta al 100%'), crea y ejecuta inmediatamente una herramienta dinámica que actualice la columna 'combustible_nivel_porcentaje' al valor numérico indicado para dicho equipo (ej. WHERE codigo_interno = 'CAAL-0002'). Responde confirmando que el combustible ha sido actualizado al porcentaje indicado.
   - **CONTROL DE ARRIENDOS:** Si te pregunta sobre a quién está arrendado un equipo o por cuánto tiempo, consulta las columnas 'arriendo_cliente' (TEXT), 'arriendo_fecha_inicio' (DATE) y 'arriendo_fecha_fin' (DATE) de la tabla 'equipos'. Si te solicita registrar o actualizar el arriendo (ej. 'Asigna el arriendo de CMPT-0015 al cliente Constructora Alfa desde hoy hasta fin de mes'), crea y ejecuta una herramienta que realice un UPDATE en estas columnas, asegurándote de cambiar la clasificación comercial ('clasificacion_comercial') a 'DISPONIBLE PARA ARRIENDO'.

CRÍTICO - ESQUEMA DE BASE DE DATOS:
Todas las tablas pertenecen al esquema 'maquinaria'.
El cliente 'supabase' inyectado en tus herramientas ya está configurado internamente para usar el esquema 'maquinaria' por defecto. Por lo tanto, en tus códigos JavaScript debes consultar las tablas directamente sin prefijar el esquema (ej. escribe supabase.from("equipos") and NO supabase.from("maquinaria.equipos")).

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

  // Cargar historial previo de la conversación para no perder el contexto
  const historialPrevio = await cargarHistorialGemini(supabase, phoneClean, 12);

  let currentParts = [];
  if (audio && audio.data) {
    currentParts.push({
      inlineData: {
        mimeType: audio.mimeType || "audio/ogg",
        data: audio.data
      }
    });
  }
  currentParts.push({ text: message || "Analiza el audio e interactúa con el supervisor." });

  let contents = [
    ...historialPrevio,
    { role: "user", parts: currentParts }
  ];

  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
        console.log(`[adminHandler] [Iteración ${iteracion}] ⚡ Gemini solicitó ejecutar ${functionCalls.length} funciones.`);
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
              console.log(`[adminHandler] 🛠️ Registrando nueva herramienta dinámica: ${nombre_funcion}`);

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
              console.log(`[adminHandler] ⚡ Ejecutando herramienta dinámica: ${name} con args:`, JSON.stringify(args));

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

        currentContents.push(candidate.content);
        currentContents.push({ role: "function", parts: functionResponses });

        // Actualizar catálogo de herramientas
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

    // Guardar la interacción actual en la base de datos de chat
    await guardarMensajeChat(supabase, phoneClean, "user", message || "[Audio de supervisor]", audio ? "audio" : "texto");
    if (responseText) {
      await guardarMensajeChat(supabase, phoneClean, "model", responseText, "texto");
      await enviarMensajeWhatsApp(jid, phoneClean, responseText, !!audio, geminiKey);
    }
    return res.status(200).json({ success: true, responseText });

  } catch (geminiErr) {
    console.error("[adminHandler] Error chateando con Supervisor:", geminiErr.message, geminiErr.stack);
    await enviarMensajeWhatsApp(jid, phoneClean, "Hola, lo siento, tuve un problema al procesar tu consulta comercial. Intenta de nuevo por favor.", !!audio, geminiKey);
    return res.status(500).json({ success: false, error: geminiErr.message });
  }
}
