import { createAdminClient } from "../../lib/supabase-server";
import { buscarPersonal } from "../../lib/bot/services/personalService";
import { obtenerSesionActiva } from "../../lib/bot/services/sessionService";
import { handleRegistroFlow } from "../../lib/bot/handlers/registroHandler";
import { handleAdminFlow } from "../../lib/bot/handlers/adminHandler";
import { handleCheckinFlow } from "../../lib/bot/handlers/checkinHandler";
import { handleJornadaFlow } from "../../lib/bot/handlers/jornadaHandler";
import { enviarMensajeWhatsApp } from "../../lib/bot/services/messageService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  // Validar secreto del bridge
  const bridgeSecret = process.env.WA_BRIDGE_SECRET;
  if (bridgeSecret?.trim()) {
    if (req.headers["x-wa-bridge-secret"] !== bridgeSecret) {
      console.warn("[whatsapp-incoming] 🚫 Secreto inválido");
      return res.status(401).json({ success: false, message: "No autorizado" });
    }
  }

  const { phone, jid, message, audio, image, localImagePath, senderPn, location } = req.body;
  
  let searchPhone = senderPn || phone || "";
  if (typeof searchPhone === "string") {
    searchPhone = searchPhone.split("@")[0].split(":")[0];
  }
  const phoneClean = searchPhone.replace(/[^0-9]/g, "");

  if (!phoneClean) {
    return res.status(400).json({ success: false, message: "Falta phone" });
  }

  console.log(
    `[whatsapp-incoming] De: ${phoneClean} | ${audio ? "🎤 Audio" : image ? "📷 Imagen" : `💬 "${message}"`}`
  );

  // Simular presencia (escribiendo)
  const BRIDGE_URL = process.env.WA_BRIDGE_URL || "http://localhost:3025";
  const destJid = jid || `${phoneClean}@s.whatsapp.net`;
  fetch(`${BRIDGE_URL}/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: destJid, state: audio ? "recording" : "composing" }),
  }).catch(() => {});

  let personal = null;
  let sesion = null;

  try {
    const supabase = createAdminClient();

    // 1. Resolver entidades core (Personal y Sesión activa)
    const [persRes, sesRes] = await Promise.all([
      buscarPersonal(supabase, phoneClean),
      obtenerSesionActiva(supabase, phoneClean)
    ]);
    personal = persRes;
    sesion = sesRes;

    const ctx = {
      supabase,
      personal,
      sesion,
      phoneClean,
      jid,
      message,
      audio,
      image,
      localImagePath,
      location,
      geminiKey: process.env.GEMINI_API_KEY
    };

    // 2. Ruteo por auto-registro si no está registrado
    if (!personal) {
      return await handleRegistroFlow(ctx, res);
    }

    const esAdmin = personal.rol === "Supervisor" || personal.rol === "Jefe de Area";
    const msgUpper = (message || "").trim().toUpperCase();

    // Caso A: Flujo conversacional de administración para supervisores sin jornada activa
    if (esAdmin && !sesion && !msgUpper.startsWith("REPORTE:")) {
      return await handleAdminFlow(ctx, res);
    }

    // Caso B: Espera de lectura de check-in (inicial)
    if (sesion?.estado_espera === "ESPERANDO_CHECKIN_AUDIO") {
      return await handleCheckinFlow(ctx, res);
    }

    // Caso C: Hitos intermedios de jornada activa, cierre o comandos de inicio/check-in
    return await handleJornadaFlow(ctx, res);

  } catch (err) {
    console.error("[whatsapp-incoming] Error general:", err.message, err.stack);
    try {
      await enviarMensajeWhatsApp(jid, phoneClean, 
        `⚠️ *Aviso del Sistema*:\n\nHola ${personal?.nombre_completo || "Operador"}, tuvimos un inconveniente al procesar tu último mensaje o audio de voz.\n\nPor favor, **intenta nuevamente** escribiendo en texto o enviando un audio más corto. ¡Gracias!`,
        !!audio,
        process.env.GEMINI_API_KEY
      );
    } catch (sendErr) {
      console.error("[whatsapp-incoming] Error al enviar mensaje de fallback en catch:", sendErr.message);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}
