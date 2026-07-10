import { enviarMensajeWhatsApp } from "../services/messageService";

const INSTRUCCION_NOMBRE = "Por favor, responde a este mensaje indicando tu *Nombre Completo* (y opcionalmente el código de tu proyecto separado por guion bajo, ej: *Juan Pérez_EIMI00413*) para enviar tu solicitud al Administrador.";

async function extraerNombreYProyecto(supabase, texto) {
  const partes = texto.split("_");
  const nombre = partes[0].trim();
  let proyectoId = null;

  if (partes.length > 1) {
    const codigo = partes[1].trim().toUpperCase();
    if (codigo) {
      const { data: proy } = await supabase
        .from("proyectos")
        .select("id")
        .eq("codigo_cc", codigo)
        .maybeSingle();
      if (proy) proyectoId = proy.id;
    }
  }

  return { nombre, proyectoId };
}

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

  // Atajo directo: REGISTRO: Juan Pérez  o  REGISTRO: Juan Pérez_EIMI00413
  if (nombreDirecto) {
    const { nombre, proyectoId } = await extraerNombreYProyecto(supabase, nombreDirecto);
    const { error: errUpsert } = await supabase
      .from("registros_pendientes")
      .upsert({
        whatsapp: phoneClean,
        nombre_completo: nombre,
        rol_solicitado: "Operador",
        estado: "esperando_rol",
        proyecto_id: proyectoId,
        nota_rechazo: null,
        created_at: new Date().toISOString()
      }, { onConflict: "whatsapp" });

    if (errUpsert) {
      console.error("[registroHandler] Error al guardar registro pendiente directo:", errUpsert.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `¡Excelente, *${nombre}*! Ahora selecciona tu rol respondiendo con el número correspondiente:\n\n1️⃣ *Operador*\n2️⃣ *Supervisor*\n3️⃣ *Rigger*\n4️⃣ *Jefe de Área*`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
  }

  // Caso 1: No existe registro previo
  if (!registroPendiente) {
    const { error: errInsert } = await supabase
      .from("registros_pendientes")
      .insert({
        whatsapp: phoneClean,
        nombre_completo: null,
        rol_solicitado: "Operador",
        estado: "esperando_nombre",
        created_at: new Date().toISOString()
      });

    if (errInsert) {
      console.error("[registroHandler] Error creando registro inicial:", errInsert.message);
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. ${INSTRUCCION_NOMBRE}`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Instrucciones de registro enviadas" });
  }

  // Caso 2: Esperando nombre completo (estado === "esperando_nombre" o nombre_completo nulo)
  if (registroPendiente.estado === "esperando_nombre" || !registroPendiente.nombre_completo) {
    if (!msgText || msgText.toUpperCase().startsWith(prefix)) {
      await enviarMensajeWhatsApp(jid, phoneClean,
        `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\n¡Perfecto! Estás a un paso de registrarte. ${INSTRUCCION_NOMBRE}`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, message: "Esperando nombre completo" });
    }

    const { nombre, proyectoId } = await extraerNombreYProyecto(supabase, msgText);
    const { error: errUpdate } = await supabase
      .from("registros_pendientes")
      .update({
        nombre_completo: nombre,
        proyecto_id: proyectoId,
        estado: "esperando_rol",
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
      `¡Excelente, *${nombre}*! Ahora selecciona tu rol respondiendo con el número correspondiente:\n\n1️⃣ *Operador*\n2️⃣ *Supervisor*\n3️⃣ *Rigger*\n4️⃣ *Jefe de Área*`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
  }

  // Caso 3: Esperando selección de rol (estado === "esperando_rol")
  if (registroPendiente.estado === "esperando_rol") {
    const rolesMapa = {
      "1": "Operador",
      "2": "Supervisor",
      "3": "Rigger",
      "4": "Jefe de Area"
    };

    const seleccion = msgText.trim();
    const rolSeleccionado = rolesMapa[seleccion];

    if (!rolSeleccionado) {
      await enviarMensajeWhatsApp(jid, phoneClean,
        `⚠️ *Selección inválida.*\n\nPor favor, responde únicamente con el número correspondiente a tu rol:\n\n1️⃣ *Operador*\n2️⃣ *Supervisor*\n3️⃣ *Rigger*\n4️⃣ *Jefe de Área*`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, message: "Esperando rol con selección correcta" });
    }

    const { error: errUpdateRol } = await supabase
      .from("registros_pendientes")
      .update({
        rol_solicitado: rolSeleccionado,
        estado: "pendiente",
        created_at: new Date().toISOString()
      })
      .eq("whatsapp", phoneClean);

    if (errUpdateRol) {
      console.error("[registroHandler] Error guardando rol solicitado:", errUpdateRol.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `✅ *Solicitud de Registro Recibida*\n\n• *Nombre:* ${registroPendiente.nombre_completo}\n• *Rol Solicitado:* ${rolSeleccionado}\n\nTu solicitud ha sido enviada al Administrador para su aprobación. Te notificaremos por este medio una vez aprobada. ¡Gracias! 👷‍♂️`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "SOLICITUD_COMPLETA" });
  }

  // Caso 4: Solicitud ya está pendiente de aprobación por el Admin
  if (registroPendiente.estado === "pendiente") {
    await enviarMensajeWhatsApp(jid, phoneClean,
      `⏳ *Tu solicitud sigue pendiente*\n\nHola *${registroPendiente.nombre_completo}*, tu solicitud de registro como *${registroPendiente.rol_solicitado}* está siendo revisada por un Administrador.\n\nTe notificaremos por este medio inmediatamente después de ser aprobada.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Solicitud pendiente" });
  }

  // Caso 5: Solicitud rechazada
  if (registroPendiente.estado === "rechazado") {
    const { error: errReset } = await supabase
      .from("registros_pendientes")
      .update({
        nombre_completo: null,
        estado: "esperando_nombre",
        nota_rechazo: null,
        created_at: new Date().toISOString()
      })
      .eq("whatsapp", phoneClean);

    if (errReset) {
      console.error("[registroHandler] Error reseteando solicitud rechazada:", errReset.message);
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `❌ *Solicitud Anterior Rechazada*\n\nTu solicitud anterior fue rechazada.\n*Motivo:* ${registroPendiente.nota_rechazo || "No cumple con los requisitos de la faena."}\n\nPor favor, responde con tu *Nombre Completo* para enviar una nueva solicitud.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Solicitud rechazada reseteada" });
  }

  return res.status(200).json({ success: true, message: "No registrado" });
}
