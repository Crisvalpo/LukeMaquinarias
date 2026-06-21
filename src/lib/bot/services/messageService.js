const BRIDGE_URL = process.env.WA_BRIDGE_URL || "http://localhost:3025";

export async function enviarMensajeWhatsApp(jid, phoneClean, texto, tieneAudioEntrante = false, geminiKey = null) {
  const dest = jid || `${phoneClean}@s.whatsapp.net`;
  let audioBase64ParaEnviar = null;

  // TTS deshabilitado: ningún modelo Gemini soporta actualmente el endpoint de audio generativo
  // de forma estable. El bot responde siempre en texto.

  try {
    await fetch(`${BRIDGE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: dest,
        text: audioBase64ParaEnviar ? "" : texto,
        audioBase64: audioBase64ParaEnviar || null,
      }),
    });
  } catch (err) {
    console.error("[messageService] Error enviando mensaje a través del bridge:", err.message);
  }
}

export async function guardarMensajeChat(supabase, whatsapp_remitente, rol, contenido, tipo_mensaje = "texto", reporte_id = null) {
  const { data, error } = await supabase
    .from("mensajes_chat")
    .insert({ whatsapp_remitente, reporte_id, rol, tipo_mensaje, contenido })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[mensajes_chat] Error guardando mensaje:", error.message);
    return null;
  }
  return data;
}

export async function cargarHistorialGemini(supabase, whatsapp_remitente, limite = 10) {
  const { data, error } = await supabase
    .from("mensajes_chat")
    .select("rol, contenido")
    .eq("whatsapp_remitente", whatsapp_remitente)
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error || !data?.length) return [];

  return data.reverse().map(msg => ({
    role: msg.rol, // 'user' o 'model'
    parts: [{ text: msg.contenido }]
  }));
}

export async function notificarSupervisor(supabase, supervisorId, mensaje) {
  if (!supervisorId) return;
  const { data: sup } = await supabase
    .from("personal")
    .select("whatsapp, nombre_completo")
    .eq("id", supervisorId)
    .maybeSingle();

  if (sup?.whatsapp) {
    await enviarMensajeWhatsApp(null, sup.whatsapp, `🚨 ALERTA CRÍTICA LukeMontaje:\n${mensaje}`);
  }
}
