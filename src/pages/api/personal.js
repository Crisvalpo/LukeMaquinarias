import { createAdminClient } from "../../lib/supabase-server";

function formatRut(val) {
  if (!val) return "";
  const clean = val.replace(/[^0-9kK]/g, "").slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  let formattedBody = "";
  let count = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    formattedBody = body.charAt(i) + formattedBody;
    count++;
    if (count === 3 && i > 0) {
      formattedBody = "." + formattedBody;
      count = 0;
    }
  }
  return `${formattedBody}-${dv}`;
}

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { search, page, limit } = req.query;

    let query = supabase
      .from("personal")
      .select("*, proyectos(nombre_proyecto, codigo_cc)", { count: "exact" });

    // Filtrar por búsqueda si se provee
    if (search && search.trim() !== "") {
      const searchStr = search.trim();
      const searchTerms = `%${searchStr}%`;
      const cleanSearch = searchStr.replace(/[^0-9kK]/g, "");
      let orFilter = `nombre_completo.ilike.${searchTerms},rut.ilike.${searchTerms},whatsapp.ilike.${searchTerms},rol.ilike.${searchTerms}`;
      
      if (cleanSearch.length >= 7 && cleanSearch.length <= 9) {
        const formatted = formatRut(cleanSearch);
        orFilter += `,rut.ilike.%${formatted}%`;
      }
      query = query.or(orFilter);
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
    const formattedRut = formatRut(rut);

    const { data, error } = await supabase
      .from("personal")
      .insert({
        rut: formattedRut,
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
    if (updates.hasOwnProperty("rut") && updates.rut) {
      updates.rut = formatRut(updates.rut);
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

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: "Falta id del personal" });

    const { error } = await supabase
      .from("personal")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, message: "Personal eliminado exitosamente" });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
