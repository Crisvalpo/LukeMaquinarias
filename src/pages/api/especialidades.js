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
    const { nombre_oficial, descripcion } = req.body;
    if (!nombre_oficial) {
      return res.status(400).json({ success: false, message: "Falta nombre_oficial" });
    }

    const { data, error } = await supabase
      .from("especialidades")
      .insert({ nombre_oficial, descripcion })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
