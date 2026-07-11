import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { equipo_id } = req.query;
    let query = supabase
      .from("mantenciones_ejecutadas")
      .select("*, personal(nombre_completo)")
      .order("fecha", { ascending: false });

    if (equipo_id) query = query.eq("equipo_id", equipo_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    const { equipo_id, tipo_pm, fecha, lectura_al_momento, responsable_id, notas } = req.body;

    if (!equipo_id || !tipo_pm || lectura_al_momento === undefined || lectura_al_momento === null) {
      return res.status(400).json({ success: false, error: "Faltan campos requeridos (equipo_id, tipo_pm, lectura_al_momento)." });
    }

    const { data, error } = await supabase
      .from("mantenciones_ejecutadas")
      .insert({
        equipo_id,
        tipo_pm,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        lectura_al_momento,
        responsable_id: responsable_id || null,
        notas: notas || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
