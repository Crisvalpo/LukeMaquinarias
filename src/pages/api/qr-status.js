import path from "path";
import fs from "fs";

// Cargar puerto desde variables de entorno
const WA_BRIDGE_URL = process.env.WA_BRIDGE_URL || "http://localhost:4000/equipos";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  try {
    const response = await fetch(`${WA_BRIDGE_URL}/qr`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      return res.status(200).json({
        success: false,
        status: "disconnected",
        qr: null,
        message: `El puente de WhatsApp respondió con estado HTTP ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      status: data.status || "disconnected",
      qr: data.qr || null
    });
  } catch (err) {
    console.error("[api/qr-status] Error conectando al puente de WhatsApp:", err.message);
    return res.status(200).json({
      success: false,
      status: "disconnected",
      qr: null,
      message: `No se pudo conectar al puente de WhatsApp en ${WA_BRIDGE_URL} (¿está corriendo?)`
    });
  }
}
