import { createAdminClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();
  const { equipoId, latitude, longitude } = req.body;

  if (!equipoId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: "Faltan parámetros requeridos (equipoId, latitude, longitude)" });
  }

  try {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: "Coordenadas latitud/longitud inválidas" });
    }

    // 1. Actualizar las coordenadas de geolocalización del equipo en la base de datos
    const { error } = await supabase
      .from("equipos")
      .update({
        latitud_actual: lat,
        longitud_actual: lng,
        ultima_ubicacion_fecha: new Date().toISOString()
      })
      .eq("id", equipoId);

    if (error) {
      console.error("Error al actualizar la ubicación del equipo:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: "Ubicación del equipo actualizada exitosamente",
      coordenadas: { latitude: lat, longitude: lng }
    });

  } catch (err) {
    console.error("Error crítico en update-ubicacion:", err.message);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}
