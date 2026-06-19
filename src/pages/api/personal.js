import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("personal")
      .select("*, proyectos(nombre_proyecto, codigo_cc)")
      .order("nombre_completo");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    const { rut, nombre_completo, whatsapp, rol, turno_tipo, jornada_tipo, proyecto_actual_id } = req.body;
    if (!rut || !nombre_completo || !whatsapp || !rol) {
      return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    const cleanProyectoId = proyecto_actual_id === "" ? null : proyecto_actual_id;

    const { data, error } = await supabase
      .from("personal")
      .insert({ rut, nombre_completo, whatsapp, rol, turno_tipo: turno_tipo || "14x14", jornada_tipo: jornada_tipo || "Dia", proyecto_actual_id: cleanProyectoId })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Falta id" });

    if (updates.hasOwnProperty("proyecto_actual_id") && updates.proyecto_actual_id === "") {
      updates.proyecto_actual_id = null;
    }

    const { data, error } = await supabase
      .from("personal")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
