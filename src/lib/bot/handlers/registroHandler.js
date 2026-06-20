import { enviarMensajeWhatsApp } from "../services/messageService";

export async function handleRegistroFlow(ctx, res) {
  const { supabase, phoneClean, jid, message, audio, geminiKey } = ctx;

  const { data: registroPendiente } = await supabase
    .from("registros_pendientes")
    .select("*")
    .eq("whatsapp", phoneClean)
    .maybeSingle();

  const msgText = (message || "").trim();
  const prefix = "REGISTRO:";
  const SUFIJOS_RESERVADOS = ["NUEVO", "INICIO", "START", ""];
  let nombreDirecto = null;
  
  if (msgText.toUpperCase().startsWith(prefix)) {
    const sufijo = msgText.slice(prefix.length).trim();
    if (sufijo && !SUFIJOS_RESERVADOS.includes(sufijo.toUpperCase())) {
      nombreDirecto = sufijo;
    }
  }

  // Atajo directo: REGISTRO: Juan Pérez
  if (nombreDirecto) {
    const { error: errUpsert } = await supabase
      .from("registros_pendientes")
      .upsert({
        whatsapp: phoneClean,
        nombre_completo: nombreDirecto,
        rol_solicitado: "Operador",
        estado: "pendiente",
        nota_rechazo: null,
        created_at: new Date().toISOString()
      }, { onConflict: "whatsapp" });

    if (errUpsert) {
      console.error("[registroHandler] Error al guardar registro pendiente:", errUpsert.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${nombreDirecto}\n• *Rol:* Operador\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias!`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "SOLICITUD_CREADA" });
  }

  const esMensajeDeRegistro = msgText.toUpperCase().startsWith(prefix);

  // Caso 1: No existe registro previo
  if (!registroPendiente) {
    const { error: errInsert } = await supabase
      .from("registros_pendientes")
      .insert({
        whatsapp: phoneClean,
        nombre_completo: null,
        rol_solicitado: "Operador",
        estado: "pendiente",
        created_at: new Date().toISOString()
      });

    if (errInsert) {
      console.error("[registroHandler] Error creando registro inicial:", errInsert.message);
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. Por favor, responde a este mensaje indicando tu *Nombre Completo* para enviar tu solicitud al Administrador.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Instrucciones de registro enviadas" });
  }

  // Caso 2: Falta ingresar el nombre completo
  if (!registroPendiente.nombre_completo) {
    if (!msgText || esMensajeDeRegistro) {
      await enviarMensajeWhatsApp(jid, phoneClean,
        `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. Por favor, responde a este mensaje indicando tu *Nombre Completo* para enviar tu solicitud al Administrador.`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, message: "Esperando nombre completo" });
    }

    const { error: errUpdate } = await supabase
      .from("registros_pendientes")
      .update({
        nombre_completo: msgText,
        estado: "pendiente",
        nota_rechazo: null,
        created_at: new Date().toISOString()
      })
      .eq("whatsapp", phoneClean);

    if (errUpdate) {
      console.error("[registroHandler] Error guardando nombre completo:", errUpdate.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${msgText}\n• *Rol:* Operador\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias!`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "SOLICITUD_CREADA" });
  }

  // Caso 3: Solicitud ya está pendiente
  if (registroPendiente.estado === "pendiente") {
    await enviarMensajeWhatsApp(jid, phoneClean,
      `⏳ *Tu solicitud sigue pendiente*\n\nHola *${registroPendiente.nombre_completo}*, tu solicitud de registro como *Operador* está siendo revisada por un Administrador.\n\nTe notificaremos por este medio inmediatamente después de ser aprobada.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Solicitud pendiente" });
  }

  // Caso 4: Solicitud rechazada
  if (registroPendiente.estado === "rechazado") {
    const { error: errReset } = await supabase
      .from("registros_pendientes")
      .update({
        nombre_completo: null,
        estado: "pendiente",
        nota_rechazo: null,
        created_at: new Date().toISOString()
      })
      .eq("whatsapp", phoneClean);

    if (errReset) {
      console.error("[registroHandler] Error reseteando solicitud rechazada:", errReset.message);
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `❌ *Solicitud Anterior Rechazada*\n\nTu solicitud anterior fue rechazada.\n*Motivo:* ${registroPendiente.nota_rechazo || "No cumple con los requisitos de la faena."}\n\nPor favor, responde a este mensaje indicando tu *Nombre Completo* para enviar una nueva solicitud.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Solicitud rechazada reseteada" });
  }

  return res.status(200).json({ success: true, message: "No registrado" });
}
