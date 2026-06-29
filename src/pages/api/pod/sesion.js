import { createAdminClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  // GET /api/pod/sesion?fecha=YYYY-MM-DD&proyecto_id=UUID
  // Retorna todos los participantes de la sesión del día
  if (req.method === "GET") {
    const { fecha, proyecto_id } = req.query;
    if (!fecha || !proyecto_id) {
      return res.status(400).json({ success: false, error: "Faltan fecha o proyecto_id" });
    }

    const { data, error } = await supabase
      .from("pod_sesion_participantes")
      .select(`
        id, joined_at,
        personal ( id, nombre_completo, rol, especialidad_id,
          especialidades ( id, nombre_oficial, color )
        )
      `)
      .eq("fecha", fecha)
      .eq("proyecto_id", proyecto_id)
      .order("joined_at");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data: data || [] });
  }

  // POST /api/pod/sesion — supervisor se une
  if (req.method === "POST") {
    const { fecha, proyecto_id, personal_id } = req.body;
    if (!fecha || !proyecto_id || !personal_id) {
      return res.status(400).json({ success: false, error: "Faltan campos requeridos" });
    }

    // Upsert: si ya existe, actualiza joined_at (se vuelve a unir)
    const { data, error } = await supabase
      .from("pod_sesion_participantes")
      .upsert(
        { fecha, proyecto_id, personal_id, joined_at: new Date().toISOString() },
        { onConflict: "fecha,proyecto_id,personal_id", ignoreDuplicates: false }
      )
      .select(`
        id, joined_at,
        personal ( id, nombre_completo, rol, especialidad_id,
          especialidades ( id, nombre_oficial, color )
        )
      `)
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  // DELETE /api/pod/sesion?fecha=&proyecto_id=&personal_id=
  if (req.method === "DELETE") {
    const { fecha, proyecto_id, personal_id } = req.query;
    if (!fecha || !proyecto_id || !personal_id) {
      return res.status(400).json({ success: false, error: "Faltan parámetros" });
    }

    const { error } = await supabase
      .from("pod_sesion_participantes")
      .delete()
      .eq("fecha", fecha)
      .eq("proyecto_id", proyecto_id)
      .eq("personal_id", personal_id);

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: "Método no permitido" });
}
