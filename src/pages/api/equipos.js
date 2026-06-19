import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    // Listar equipos con estado actual y obra
    const { data, error } = await supabase
      .from("equipos")
      .select("*, obras(nombre_obra, codigo_cc)")
      .order("codigo_interno");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    // Crear nuevo equipo
    const { codigo_interno, descripcion_equipo, proveedor, obra_actual_id, pauta_preventiva_activa } = req.body;

    if (!codigo_interno || !descripcion_equipo) {
      return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    const cleanObraId = obra_actual_id === "" ? null : obra_actual_id;

    const { data, error } = await supabase
      .from("equipos")
      .insert({ codigo_interno, descripcion_equipo, proveedor: proveedor || "EIMISA", obra_actual_id: cleanObraId, pauta_preventiva_activa })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, data });
  }

  if (req.method === "PATCH") {
    // Actualizar equipo (pauta, estado, obra)
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Falta id" });

    if (updates.hasOwnProperty("obra_actual_id") && updates.obra_actual_id === "") {
      updates.obra_actual_id = null;
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
