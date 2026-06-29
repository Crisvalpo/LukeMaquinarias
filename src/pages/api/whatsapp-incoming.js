import { createAdminClient } from "../../lib/supabase-server";
import { buscarPersonal } from "../../lib/bot/services/personalService";
import { obtenerSesionActiva } from "../../lib/bot/services/sessionService";
import { handleRegistroFlow } from "../../lib/bot/handlers/registroHandler";
import { handleAdminFlow } from "../../lib/bot/handlers/adminHandler";
import { handleCheckinFlow } from "../../lib/bot/handlers/checkinHandler";
import { handleJornadaFlow } from "../../lib/bot/handlers/jornadaHandler";
import { enviarMensajeWhatsApp } from "../../lib/bot/services/messageService";
import { transcribirAudioSupervisor } from "../../lib/gemini";

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
  const geminiKey = process.env.GEMINI_API_KEY;
  
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

    // --- Flujos Especiales del POD para Supervisores ---
    if (esAdmin) {
      // Caso 1: Registrar participación voluntaria en el POD
      if (msgUpper === "PARTICIPAR_POD") {
        // Calcular fecha D+1 (el POD siempre es para mañana)
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const fechaPOD = manana.toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
        const proyectoId = personal.proyecto_actual_id || null;

        // 1. Registrar en pod_sesion_participantes (tabla en tiempo real)
        const { error: errPart } = await supabase
          .from("pod_sesion_participantes")
          .upsert(
            { fecha: fechaPOD, proyecto_id: proyectoId, personal_id: personal.id, joined_at: new Date().toISOString() },
            { onConflict: "fecha,proyecto_id,personal_id", ignoreDuplicates: false }
          );

        // También mantener compatibilidad con tabla legada participacion_pod
        await supabase
          .from("participacion_pod")
          .upsert(
            { fecha: fechaPOD, personal_id: personal.id, created_at: new Date().toISOString() },
            { onConflict: "fecha,personal_id" }
          ).catch(() => {});

        if (errPart) {
          console.error("[whatsapp-incoming] Error registrando participación POD:", errPart.message);
          await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al registrar tu participación. Por favor intenta más tarde.`, !!audio, geminiKey);
          return res.status(500).json({ success: false });
        }

        // 2. Buscar bloques asignados al supervisor para esa fecha
        const { data: bloques } = await supabase
          .from("planificacion_bloques_pod")
          .select(`
            hora_inicio, hora_fin, actividad_especifica,
            equipos ( codigo_interno, descripcion_equipo ),
            especialidades ( nombre_oficial )
          `)
          .eq("fecha", fechaPOD)
          .eq("supervisor_id", personal.id)
          .order("hora_inicio");

        // 3. Formatear fecha amigable
        const [y, m, d] = fechaPOD.split("-");
        const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
        const fechaStr = `${dias[fechaObj.getDay()]} ${d} ${meses[Number(m) - 1]}`;

        // 4. Construir mensaje de respuesta
        let msgConfirmacion = `¡Hola *${personal.nombre_completo}*! 👷‍♂️ Quedaste inscrito en la POD.\n\n📅 *Planificación para ${fechaStr}:*\n`;

        if (!bloques || bloques.length === 0) {
          msgConfirmacion += `\n⏳ Aún no tienes bloques asignados. El Jefe de Área los definirá en la sala POD.\n\nTe avisaremos cuando quede todo listo. ✅`;
        } else {
          for (const b of bloques) {
            const ini = b.hora_inicio?.slice(0, 5) || "--:--";
            const fin = b.hora_fin?.slice(0, 5) || "--:--";
            const equipo = b.equipos?.codigo_interno || "?";
            const desc = b.equipos?.descripcion_equipo || "";
            const esp = b.especialidades?.nombre_oficial || "";
            const act = b.actividad_especifica ? `\n   📌 _${b.actividad_especifica}_` : "";
            msgConfirmacion += `\n🔧 *${ini}–${fin}* | ${equipo} ${desc ? `(${desc})` : ""}\n   🏗 ${esp}${act}`;
          }
          msgConfirmacion += `\n\n¡Que tengas una excelente jornada! 💪`;
        }

        await enviarMensajeWhatsApp(jid, phoneClean, msgConfirmacion, !!audio, geminiKey);
        return res.status(200).json({ success: true, action: "PARTICIPACION_POD_REGISTRADA" });
      }

      // Caso 2: Responder a una consulta de actividad pendiente
      const { data: consultaPendiente } = await supabase
        .from("estados_consulta_bot")
        .select("*")
        .eq("telefono_supervisor", phoneClean)
        .eq("estado_pregunta", "Pendiente_Actividad")
        .maybeSingle();

      if (consultaPendiente) {
        let respuestaTexto = (message || "").trim();
        if (audio && audio.data) {
          try {
            respuestaTexto = await transcribirAudioSupervisor(audio.data, audio.mimeType);
          } catch (errTrans) {
            console.error("[whatsapp-incoming] Error transcribiendo respuesta de supervisor:", errTrans.message);
          }
        }

        if (!respuestaTexto) {
          await enviarMensajeWhatsApp(jid, phoneClean, `⚠️ No logramos procesar tu respuesta. Por favor escribe tu respuesta en texto o envía un audio más claro.`, !!audio, geminiKey);
          return res.status(200).json({ success: true, action: "RESPUESTA_SUPERVISOR_VACIA" });
        }

        // A. Actualizar planificacion_bloques_pod
        const { error: errPlan } = await supabase
          .from("planificacion_bloques_pod")
          .update({ actividad_especifica: respuestaTexto })
          .eq("id", consultaPendiente.planificacion_id);

        if (errPlan) {
          console.error("[whatsapp-incoming] Error actualizando planificacion:", errPlan.message);
        }

        // B. Actualizar hito de eventos_jornada si existe
        if (consultaPendiente.evento_operador_id) {
          const { error: errEv } = await supabase
            .from("eventos_jornada")
            .update({ nota_transcripcion: `Actividad confirmada por supervisor: ${respuestaTexto}` })
            .eq("id", consultaPendiente.evento_operador_id);

          if (errEv) {
            console.error("[whatsapp-incoming] Error actualizando evento del operador:", errEv.message);
          }

          // C. Notificar al operador
          try {
            const { data: eventoInfo } = await supabase
              .from("eventos_jornada")
              .select("reporte_id, reportes_diarios(operador_id, personal!reportes_diarios_operador_id_fkey(whatsapp, nombre_completo))")
              .eq("id", consultaPendiente.evento_operador_id)
              .maybeSingle();

            const opWa = eventoInfo?.reportes_diarios?.personal?.whatsapp;
            if (opWa) {
              await enviarMensajeWhatsApp(null, opWa, `📢 *Confirmación de Actividad*:\nTu supervisor ha confirmado la labor a realizar:\n\n_"${respuestaTexto}"_`, false, geminiKey);
            }
          } catch (errNotif) {
            console.error("[whatsapp-incoming] Error al notificar al operador:", errNotif.message);
          }
        }

        // D. Marcar la consulta como procesada
        await supabase
          .from("estados_consulta_bot")
          .update({ estado_pregunta: "Procesado", updated_at: new Date().toISOString() })
          .eq("id", consultaPendiente.id);

        await enviarMensajeWhatsApp(jid, phoneClean, `¡Excelente! Hemos registrado la actividad para este bloque:\n\n_"${respuestaTexto}"_\n\nMuchas gracias.`, !!audio, geminiKey);
        return res.status(200).json({ success: true, action: "RESPUESTA_SUPERVISOR_PROCESADA" });
      }
    }

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
