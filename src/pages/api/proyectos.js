import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("proyectos")
      .select("*")
      .order("nombre_proyecto");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    const { nombre_proyecto, codigo_cc, ubicacion } = req.body;
    if (!nombre_proyecto || !codigo_cc) {
      return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

  const { data, error } = await supabase
      .from("proyectos")
      .insert({ nombre_proyecto, codigo_cc, ubicacion })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Falta id" });

    const { data, error } = await supabase
      .from("proyectos")
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
