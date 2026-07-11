import { createAdminClient } from "../../../lib/supabase-server";
import { crearConsultaPendiente } from "../../../lib/bot/services/podConsultaService";

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

    // 2. Registrar confirmacion
    const { error: errUpdate } = await supabase
      .from("planificacion_bloques_pod")
      .update({
        confirmado_at: new Date().toISOString(),
        operador_confirmador_id: operador_id
      })
      .eq("id", bloque_id);

    if (errUpdate) throw errUpdate;

    // 3. Si hay supervisor y numero de whatsapp, enviar pregunta proactiva
    let mensajeEnviado = false;
    if (bloque.supervisor?.whatsapp) {
      await crearConsultaPendiente(supabase, {
        telefonoSupervisor: bloque.supervisor.whatsapp,
        planificacionId: bloque.id,
        especialidadId: bloque.especialidad_id,
        eventoOperadorId: null,
        geminiKey: process.env.GEMINI_API_KEY,
      });
      mensajeEnviado = true;
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
