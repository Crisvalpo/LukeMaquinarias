import { createAdminClient } from "../../../lib/supabase-server";
import { enviarMensajeWhatsApp } from "../../../lib/bot/services/messageService";

/**
 * POST /api/pod/confirmar-asignacion
 * Body: { bloque_id, operador_id, equipo_id }
 * 
 * Accion:
 *   1. Registra la confirmacion en el bloque POD (confirmado_at, operador_confirmador_id)
 *   2. Envia un WhatsApp al supervisor para pedir confirmacion de la actividad
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Metodo no permitido." });
  }

  const { bloque_id, operador_id, equipo_id } = req.body;
  if (!bloque_id || !operador_id || !equipo_id) {
    return res.status(400).json({ success: false, error: "Campos bloque_id, operador_id y equipo_id son requeridos." });
  }

  const supabase = createAdminClient();

  try {
    // 1. Obtener datos del bloque, supervisor y equipo
    const { data: bloque, error: errBloque } = await supabase
      .from("planificacion_bloques_pod")
      .select(`
        *,
        supervisor:personal!planificacion_bloques_pod_supervisor_id_fkey(id, nombre_completo, whatsapp),
        equipo:equipos(id, codigo_interno, descripcion_equipo),
        operador:personal!planificacion_bloques_pod_operador_confirmador_id_fkey(id, nombre_completo)
      `)
      .eq("id", bloque_id)
      .maybeSingle();

    if (errBloque || !bloque) {
      return res.status(404).json({ success: false, error: "Bloque de planificacion no encontrado." });
    }

    // 2. Obtener datos del operador confirmador
    const { data: operadorInfo } = await supabase
      .from("personal")
      .select("nombre_completo")
      .eq("id", operador_id)
      .maybeSingle();

    const nombreOperador = operadorInfo?.nombre_completo || "Operador";

    // 3. Registrar confirmacion
    const { error: errUpdate } = await supabase
      .from("planificacion_bloques_pod")
      .update({
        confirmado_at: new Date().toISOString(),
        operador_confirmador_id: operador_id
      })
      .eq("id", bloque_id);

    if (errUpdate) throw errUpdate;

    // 4. Si hay supervisor y numero de whatsapp, enviar pregunta proactiva
    let mensajeEnviado = false;
    if (bloque.supervisor?.whatsapp) {
      // Obtener tareas programadas de la especialidad
      const { data: tareasDb } = await supabase
        .from("tareas_programadas")
        .select("id, nombre, codigo")
        .eq("especialidad_id", bloque.especialidad_id)
        .eq("activa", true)
        .eq("es_libre", false)
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true })
        .limit(8);

      const tareas = tareasDb || [];
      let msgSupervisor;
      let tareasEnviadas = null;

      if (tareas.length > 0) {
        const numeros = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
        const listaTexto = tareas
          .map((t, i) => `${numeros[i] || `${i + 1}.`} ${t.nombre}${t.codigo ? ` _(${t.codigo})_` : ""}`)
          .join("\n");

        msgSupervisor =
          `🔧 *${bloque.equipo?.codigo_interno}* listo con operador *${nombreOperador}*.\n` +
          `¿Que actividad ejecutaras hoy?\n\n` +
          listaTexto +
          `\n\n0️⃣ Otra actividad (describe brevemente)\n\n` +
          `_Responde con el numero de tu tarea o escribe la actividad libremente._`;

        tareasEnviadas = tareas.map((t, i) => ({ orden: i + 1, id: t.id, nombre: t.nombre }));
      } else {
        msgSupervisor =
          `El operador *${nombreOperador}* indico que inicio trabajos con el equipo *${bloque.equipo?.codigo_interno}* en su bloque asignado. ` +
          `Por favor, responda a este mensaje indicando la actividad especifica del programa.`;
      }

      await enviarMensajeWhatsApp(null, bloque.supervisor.whatsapp, msgSupervisor, false, process.env.GEMINI_API_KEY);
      mensajeEnviado = true;

      // Crear o actualizar estado en estados_consulta_bot
      await supabase
        .from("estados_consulta_bot")
        .upsert({
          telefono_supervisor: bloque.supervisor.whatsapp,
          planificacion_id: bloque.id,
          estado_pregunta: "Pendiente_Actividad",
          tareas_enviadas: tareasEnviadas,
          esperando_libre: false,
          updated_at: new Date().toISOString()
        }, { onConflict: "telefono_supervisor" });
    }

    return res.status(200).json({
      success: true,
      message: "Asignacion confirmada con exito.",
      whatsapp_enviado: mensajeEnviado
    });

  } catch (err) {
    console.error("[confirmar-asignacion] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
