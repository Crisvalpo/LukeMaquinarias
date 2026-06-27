import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("especialidades")
      .select("*")
      .order("nombre_oficial");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    const { nombre_oficial, descripcion, color } = req.body;
    if (!nombre_oficial) {
      return res.status(400).json({ success: false, message: "Falta nombre_oficial" });
    }

    const { data, error } = await supabase
      .from("especialidades")
      .insert({ nombre_oficial, descripcion, color: color || "#6b7280" })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  if (req.method === "PATCH") {
    const { id, color } = req.body;
    if (!id || !color) return res.status(400).json({ success: false, message: "Faltan id o color" });

    const { data, error } = await supabase
      .from("especialidades")
      .update({ color })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: "Falta id de la especialidad" });

    const { error } = await supabase
      .from("especialidades")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, message: "Especialidad eliminada exitosamente" });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
