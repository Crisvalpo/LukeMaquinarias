import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { fecha, equipo_id, operador_id, page = 1, limit = 20 } = req.query;
    const pageSize = parseInt(limit) || 20;
    const from = (parseInt(page) - 1) * pageSize;

    let query = supabase
      .from("reportes_diarios")
      .select(
        `*, 
        equipos(codigo_interno, descripcion_equipo),
        personal!operador_id(nombre_completo)`,
        { count: "exact" }
      )
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (fecha) query = query.eq("fecha", fecha);
    if (equipo_id) query = query.eq("equipo_id", equipo_id);
    if (operador_id) query = query.eq("operador_id", operador_id);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ success: false, error: error.message });

    return res.status(200).json({ success: true, data, total: count });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
