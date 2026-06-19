import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { search, page, limit } = req.query;

    let query = supabase
      .from("personal")
      .select("*, proyectos(nombre_proyecto, codigo_cc)", { count: "exact" });

    // Filtrar por búsqueda si se provee
    if (search && search.trim() !== "") {
      const searchTerms = `%${search.trim()}%`;
      query = query.or(`nombre_completo.ilike.${searchTerms},rut.ilike.${searchTerms},whatsapp.ilike.${searchTerms},rol.ilike.${searchTerms}`);
    }

    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 15;
      const from = (pageNum - 1) * limitNum;
      const to = pageNum * limitNum - 1;

      const { data, error, count } = await query
        .order("nombre_completo")
        .range(from, to);

      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, data, count, page: pageNum, limit: limitNum });
    } else {
      // Retornar lista completa (compatibilidad)
      const { data, error, count } = await query
        .order("nombre_completo");

      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, data, count });
    }
  }

  if (req.method === "POST") {
    const { rut, nombre_completo, whatsapp, rol, turno_tipo, jornada_tipo, proyecto_actual_id, foto_url } = req.body;
    if (!rut || !nombre_completo || !whatsapp || !rol) {
      return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    const cleanProyectoId = proyecto_actual_id === "" ? null : proyecto_actual_id;

    const { data, error } = await supabase
      .from("personal")
      .insert({
        rut,
        nombre_completo,
        whatsapp,
        rol,
        turno_tipo: turno_tipo || "14x14",
        jornada_tipo: jornada_tipo || "Dia",
        proyecto_actual_id: cleanProyectoId,
        foto_url: foto_url || null
      })
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
