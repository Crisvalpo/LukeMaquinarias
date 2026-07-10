import { createAdminClient } from "../../../lib/supabase-server";

// Crea una fila en `actividades` a partir de una tarea de catálogo o una descripción libre.
// No intenta reusar actividades existentes: cada bloque queda con su propia actividad.
async function crearActividad(supabase, { fecha, proyecto_id, especialidad_id, tarea_programada_id, descripcion, cantidad_planificada, unidad }) {
  const { data, error } = await supabase
    .from("actividades")
    .insert({
      fecha,
      proyecto_id: proyecto_id || null,
      especialidad_id: especialidad_id || null,
      tarea_programada_id: tarea_programada_id || null,
      descripcion: tarea_programada_id ? null : (descripcion || null),
      programada: true,
      cantidad_planificada: cantidad_planificada || null,
      unidad: unidad || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// Texto legible para el campo legado `actividad_especifica` (PDF/historial siguen leyendo este texto).
async function textoActividad(supabase, { tarea_programada_id, descripcion }) {
  if (tarea_programada_id) {
    const { data } = await supabase
      .from("tareas_programadas")
      .select("nombre")
      .eq("id", tarea_programada_id)
      .maybeSingle();
    return data?.nombre || descripcion || null;
  }
  return descripcion || null;
}

export default async function handler(req, res) {
  const supabase = createAdminClient();

  // GET /api/pod/bloques?fecha=YYYY-MM-DD
  if (req.method === "GET") {
    const { fecha, proyecto_id } = req.query;
    const hoy = fecha || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });

    let query = supabase
      .from("planificacion_bloques_pod")
      .select(`
        id, fecha, hora_inicio, hora_fin, actividad_especifica,
        actividades ( id, tarea_programada_id, descripcion, programada, cantidad_planificada, unidad ),
        equipos ( id, codigo_interno, descripcion_equipo, plataforma_estado, plataforma_detalle, plataforma_especialidad_id, proyecto_actual_id ),
        especialidades ( id, nombre_oficial ),
        supervisor:personal!planificacion_bloques_pod_supervisor_id_fkey ( id, nombre_completo, whatsapp )
      `)
      .eq("fecha", hoy)
      .order("hora_inicio");

    // Filtrar por proyecto si se especifica
    if (proyecto_id) {
      query = query.eq("equipos.proyecto_actual_id", proyecto_id);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ success: false, error: error.message });
    // Si filtramos por proyecto, excluir bloques donde el equipo no pertenece al proyecto
    const filteredData = proyecto_id
      ? (data || []).filter(b => b.equipos?.proyecto_actual_id === proyecto_id)
      : (data || []);
    return res.status(200).json({ success: true, data: filteredData });
  }

  // POST /api/pod/bloques — crear bloque
  if (req.method === "POST") {
    const {
      fecha, equipo_id, hora_inicio, hora_fin, especialidad_id, supervisor_id,
      tarea_programada_id, descripcion, cantidad_planificada, unidad
    } = req.body;

    if (!fecha || !equipo_id || !hora_inicio || !hora_fin || !especialidad_id || !supervisor_id) {
      return res.status(400).json({ success: false, error: "Faltan campos requeridos." });
    }

    let actividad_id = null;
    let actividad_especifica = null;
    if (tarea_programada_id || descripcion) {
      const { data: equipo } = await supabase.from("equipos").select("proyecto_actual_id").eq("id", equipo_id).maybeSingle();
      actividad_id = await crearActividad(supabase, {
        fecha, proyecto_id: equipo?.proyecto_actual_id, especialidad_id, tarea_programada_id, descripcion, cantidad_planificada, unidad
      });
      actividad_especifica = await textoActividad(supabase, { tarea_programada_id, descripcion });
    }

    const { data, error } = await supabase
      .from("planificacion_bloques_pod")
      .insert({ fecha, equipo_id, hora_inicio, hora_fin, especialidad_id, supervisor_id, actividad_especifica, actividad_id })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  // PATCH /api/pod/bloques — editar bloque
  if (req.method === "PATCH") {
    const {
      id, hora_inicio, hora_fin, especialidad_id, supervisor_id,
      tarea_programada_id, descripcion, cantidad_planificada, unidad
    } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "Falta id del bloque." });

    const updates = {};
    if (hora_inicio)      updates.hora_inicio = hora_inicio;
    if (hora_fin)         updates.hora_fin = hora_fin;
    if (especialidad_id)  updates.especialidad_id = especialidad_id;
    if (supervisor_id)    updates.supervisor_id = supervisor_id;

    if (tarea_programada_id !== undefined || descripcion !== undefined) {
      if (!tarea_programada_id && !descripcion) {
        updates.actividad_id = null;
        updates.actividad_especifica = null;
      } else {
        const { data: bloqueActual } = await supabase
          .from("planificacion_bloques_pod")
          .select("fecha, equipo_id, especialidad_id, equipos(proyecto_actual_id)")
          .eq("id", id)
          .maybeSingle();

        updates.actividad_id = await crearActividad(supabase, {
          fecha: bloqueActual?.fecha,
          proyecto_id: bloqueActual?.equipos?.proyecto_actual_id,
          especialidad_id: especialidad_id || bloqueActual?.especialidad_id,
          tarea_programada_id, descripcion, cantidad_planificada, unidad
        });
        updates.actividad_especifica = await textoActividad(supabase, { tarea_programada_id, descripcion });
      }
    }

    const { data, error } = await supabase
      .from("planificacion_bloques_pod")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  // DELETE /api/pod/bloques?id=UUID
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: "Falta id." });

    const { error } = await supabase
      .from("planificacion_bloques_pod")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: "Método no permitido." });
}
