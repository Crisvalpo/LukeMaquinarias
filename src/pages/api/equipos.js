import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { search, page, limit } = req.query;

    let query = supabase
      .from("equipos")
      .select("*, proyectos(nombre_proyecto, codigo_cc)", { count: "exact" });

    // Filtrar por búsqueda si se provee
    if (search && search.trim() !== "") {
      const searchTerms = `%${search.trim()}%`;
      query = query.or(`codigo_interno.ilike.${searchTerms},descripcion_equipo.ilike.${searchTerms},marca.ilike.${searchTerms},modelo.ilike.${searchTerms},patente.ilike.${searchTerms},categoria.ilike.${searchTerms},tipo.ilike.${searchTerms}`);
    }

    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 15;
      const from = (pageNum - 1) * limitNum;
      const to = pageNum * limitNum - 1;

      const { data, error, count } = await query
        .order("codigo_interno")
        .range(from, to);

      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, data, count, page: pageNum, limit: limitNum });
    } else {
      // Retornar lista completa (compatibilidad)
      const { data, error, count } = await query
        .order("codigo_interno");

      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, data, count });
    }
  }

  if (req.method === "POST") {
    // Crear nuevo equipo
    const { codigo_interno, descripcion_equipo, proveedor, proyecto_actual_id, pauta_preventiva_activa } = req.body;

    if (!codigo_interno || !descripcion_equipo) {
      return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    const cleanProyectoId = proyecto_actual_id === "" ? null : proyecto_actual_id;

    const { data, error } = await supabase
      .from("equipos")
      .insert({ codigo_interno, descripcion_equipo, proveedor: proveedor || "EIMISA", proyecto_actual_id: cleanProyectoId, pauta_preventiva_activa })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  if (req.method === "PATCH") {
    // Actualizar equipo (pauta, estado, proyecto)
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Falta id" });

    if (updates.hasOwnProperty("proyecto_actual_id") && updates.proyecto_actual_id === "") {
      updates.proyecto_actual_id = null;
    }

    const { data, error } = await supabase
      .from("equipos")
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
