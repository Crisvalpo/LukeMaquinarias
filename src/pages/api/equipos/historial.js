import { createAdminClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: "Falta id del equipo" });
    }

    try {
      const { data, error } = await supabase
        .from("reportes_diarios")
        .select(`
          id,
          fecha,
          horometro_inicio,
          horometro_final,
          horas_trabajadas,
          petroleo_litros,
          estado_final,
          pdf_url,
          operador:personal!operador_id(nombre_completo, whatsapp),
          supervisor:personal!supervisor_id(nombre_completo, whatsapp),
          rigger:personal!rigger_id(nombre_completo, whatsapp),
          eventos_jornada(
            id,
            estado_hito,
            hora_evento,
            nota_transcripcion,
            especialidades(nombre_oficial)
          )
        `)
        .eq("equipo_id", id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .order("hora_evento", { foreignTable: "eventos_jornada", ascending: true })
        .limit(30);

      if (error) {
        console.error("[api/equipos/historial] Error en query:", error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data });
    } catch (e) {
      console.error("[api/equipos/historial] Exception:", e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
