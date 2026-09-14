import { enviarMensajeWhatsApp } from "../services/messageService";

const INSTRUCCION_NOMBRE = "Por favor, responde a este mensaje indicando tu *Nombre Completo* para enviar tu solicitud al Administrador.";

async function resolverEquipoYProyecto(supabase, codigoEquipo) {
  const c = (codigoEquipo || "").trim();
  if (!c) return null;

  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, codigo_interno, descripcion_equipo, proyecto_actual_id, proyectos(id, nombre_proyecto, codigo_cc)")
    .ilike("codigo_interno", c)
    .maybeSingle();

  return equipo;
}

async function resolverProyecto(supabase, texto) {
  const t = (texto || "").trim();
  if (!t) return null;

  const { data: porCodigo } = await supabase
    .from("proyectos")
    .select("id, nombre_proyecto, codigo_cc")
    .ilike("codigo_cc", `%${t}%`)
    .limit(2);
  if (porCodigo && porCodigo.length === 1) return porCodigo[0];

  const { data: porNombre } = await supabase
    .from("proyectos")
    .select("id, nombre_proyecto, codigo_cc")
    .ilike("nombre_proyecto", `%${t}%`)
    .limit(2);
  if (porNombre && porNombre.length === 1) return porNombre[0];

  return null;
}

async function extraerNombreYProyecto(supabase, texto) {
  const partes = texto.split("_");
  const nombre = partes[0].trim();
  let proyecto = null;

  if (partes.length > 1) {
    proyecto = await resolverProyecto(supabase, partes[1]);
  }

  return { nombre, proyecto };
}

const MENU_ROLES = `1️⃣ *Operador*\n2️⃣ *Rigger*`;
const ROLES_MAPA = { "1": "Operador", "2": "Rigger" };

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
  let equipoContexto = null;
  let rutContexto = null;

  if (msgText.toUpperCase().startsWith(prefix)) {
    const resto = msgText.slice(prefix.length).trim();
    
    // Extraer RUT si viene en el payload (ej. _RUT_12.345.678-K o _RUT_12345678-K)
    const matchRut = resto.match(/(?:_RUT_|_RUT:)([0-9kK.-]+)/i);
    if (matchRut) {
      rutContexto = matchRut[1].trim();
    }

    // Verificar si viene con payload de equipo: ej. NUEVO_EQ_EIMI00387 o EQ_EIMI00387
    const matchEq = resto.match(/(?:NUEVO_)?EQ_([a-zA-Z0-9_-]+)/i);
    if (matchEq) {
      equipoContexto = await resolverEquipoYProyecto(supabase, matchEq[1]);
    } else if (resto && !SUFIJOS_RESERVADOS.includes(resto.toUpperCase())) {
      nombreDirecto = resto;
    }
  }

  // Inicio de registro con QR de equipo detectado
  if (equipoContexto) {
    const proyectoEquipo = equipoContexto.proyectos;
    const { error: errUpsert } = await supabase
      .from("registros_pendientes")
      .upsert({
        whatsapp: phoneClean,
        nombre_completo: null,
        rol_solicitado: "Operador",
        estado: "esperando_nombre",
        proyecto_id: proyectoEquipo?.id || null,
        rut: rutContexto || null,
        nota_rechazo: null,
        created_at: new Date().toISOString()
      }, { onConflict: "whatsapp" });

    if (errUpsert) {
      console.error("[registroHandler] Error al iniciar registro con equipo:", errUpsert.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    const descEq = equipoContexto.descripcion_equipo || equipoContexto.codigo_interno;
    const textoProyecto = proyectoEquipo
      ? `, actualmente asignado al proyecto *${proyectoEquipo.nombre_proyecto}*`
      : "";

    await enviarMensajeWhatsApp(jid, phoneClean,
      `👷‍♂️ *¡Bienvenido a LukeEquipos!*\n\nDetectamos que estás en el equipo *${descEq}* (${equipoContexto.codigo_interno})${textoProyecto}.\n\n¡Perfecto! Estás a un paso de registrarte. ${INSTRUCCION_NOMBRE}`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Registro iniciado con contexto de equipo" });
  }

  // Atajo directo: REGISTRO: Juan Pérez  o  REGISTRO: Juan Pérez_EIMI00413
  if (nombreDirecto) {
    const { nombre, proyecto } = await extraerNombreYProyecto(supabase, nombreDirecto);

    if (proyecto) {
      const { error: errUpsert } = await supabase
        .from("registros_pendientes")
        .upsert({
          whatsapp: phoneClean,
          nombre_completo: nombre,
          rol_solicitado: "Operador",
          estado: "esperando_rol",
          proyecto_id: proyecto.id,
          rut: rutContexto || null,
          nota_rechazo: null,
          created_at: new Date().toISOString()
        }, { onConflict: "whatsapp" });

      if (errUpsert) {
        console.error("[registroHandler] Error al guardar registro pendiente directo:", errUpsert.message);
        await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
        return res.status(500).json({ success: false });
      }

      await enviarMensajeWhatsApp(jid, phoneClean,
        `¡Excelente, *${nombre}*! Proyecto: *${proyecto.nombre_proyecto}*.\n\nAhora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
    }

    // No se pudo resolver el proyecto desde el atajo — preguntar por separado
    const { error: errUpsert } = await supabase
      .from("registros_pendientes")
      .upsert({
        whatsapp: phoneClean,
        nombre_completo: nombre,
        rol_solicitado: "Operador",
        estado: "esperando_proyecto",
        proyecto_id: null,
        rut: rutContexto || null,
        nota_rechazo: null,
        created_at: new Date().toISOString()
      }, { onConflict: "whatsapp" });

    if (errUpsert) {
      console.error("[registroHandler] Error al guardar registro pendiente directo:", errUpsert.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    await enviarMensajeWhatsApp(jid, phoneClean,
      `¡Gracias, *${nombre}*! ¿A qué proyecto u obra perteneces? Indícame el nombre o el código (ej: *EIMI00413*).`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "ESPERANDO_PROYECTO" });
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
        rut: rutContexto || null,
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

    // Soporta el atajo avanzado "Nombre_CODIGO" en el mismo mensaje
    const { nombre, proyecto: proyectoExplicito } = await extraerNombreYProyecto(supabase, msgText);

    if (proyectoExplicito) {
      const { error: errUpdate } = await supabase
        .from("registros_pendientes")
        .update({
          nombre_completo: nombre,
          proyecto_id: proyectoExplicito.id,
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
        `¡Excelente, *${nombre}*! Proyecto: *${proyectoExplicito.nombre_proyecto}*.\n\nAhora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
    }

    // Si no viene proyecto en el texto, verificar si ya teníamos un proyecto_id precargado (del equipo escaneado)
    let proyectoPrecargado = null;
    if (registroPendiente.proyecto_id) {
      const { data: pry } = await supabase
        .from("proyectos")
        .select("id, nombre_proyecto, codigo_cc")
        .eq("id", registroPendiente.proyecto_id)
        .maybeSingle();
      proyectoPrecargado = pry;
    }

    if (proyectoPrecargado) {
      // Guardar nombre y solicitar confirmación ágil del proyecto
      const { error: errUpdate } = await supabase
        .from("registros_pendientes")
        .update({
          nombre_completo: nombre,
          estado: "esperando_proyecto",
          nota_rechazo: null,
          created_at: new Date().toISOString()
        })
        .eq("whatsapp", phoneClean);

      if (errUpdate) {
        console.error("[registroHandler] Error guardando nombre completo:", errUpdate.message);
        await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
        return res.status(500).json({ success: false });
      }

      const ccLabel = proyectoPrecargado.codigo_cc ? ` (${proyectoPrecargado.codigo_cc})` : "";
      await enviarMensajeWhatsApp(jid, phoneClean,
        `¡Gracias, *${nombre}*!\n\nEl equipo que escaneaste está asignado al proyecto:\n📍 *${proyectoPrecargado.nombre_proyecto}*${ccLabel}\n\n¿Confirmas que perteneces a este proyecto?\n\n1️⃣ *Sí, pertenezco a este proyecto*\n2️⃣ *No, pertenezco a otro proyecto*`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, action: "CONFIRMAR_PROYECTO_EQUIPO" });
    }

    // Sin proyecto precargado: flujo original preguntando por el proyecto
    const { error: errUpdate } = await supabase
      .from("registros_pendientes")
      .update({
        nombre_completo: nombre,
        proyecto_id: null,
        estado: "esperando_proyecto",
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
      `¡Gracias, *${nombre}*! ¿A qué proyecto u obra perteneces? Indícame el nombre o el código (ej: *EIMI00413*).`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "ESPERANDO_PROYECTO" });
  }

  // Caso 3: Esperando proyecto (estado === "esperando_proyecto")
  if (registroPendiente.estado === "esperando_proyecto") {
    // Si tenía un proyecto_id precargado, evaluamos si respondió 1 (Sí) o 2 (No)
    if (registroPendiente.proyecto_id) {
      const resp = msgText.trim().toLowerCase();
      const esConfirmacion = /^(1|si|sí|confirmar|confirmo|correcto|yes|ok)$/i.test(resp);
      const esRechazo = /^(2|no|otro|cambiar)$/i.test(resp);

      if (esConfirmacion) {
        const { error: errUpdate } = await supabase
          .from("registros_pendientes")
          .update({
            estado: "esperando_rol",
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        if (errUpdate) {
          console.error("[registroHandler] Error confirmando proyecto:", errUpdate.message);
          await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
          return res.status(500).json({ success: false });
        }

        const { data: pryConfirmado } = await supabase
          .from("proyectos")
          .select("nombre_proyecto")
          .eq("id", registroPendiente.proyecto_id)
          .maybeSingle();

        const nombrePry = pryConfirmado ? `Proyecto: *${pryConfirmado.nombre_proyecto}*.\n\n` : "";
        await enviarMensajeWhatsApp(jid, phoneClean,
          `¡Excelente! ${nombrePry}Ahora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
          !!audio,
          geminiKey
        );
        return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
      }

      if (esRechazo) {
        // Limpiamos proyecto_id para pedirlo de forma manual
        await supabase
          .from("registros_pendientes")
          .update({
            proyecto_id: null,
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        await enviarMensajeWhatsApp(jid, phoneClean,
          `Entendido. ¿A qué proyecto u obra perteneces? Indícame el nombre o el código (ej: *EIMI00413*).`,
          !!audio,
          geminiKey
        );
        return res.status(200).json({ success: true, message: "Esperando proyecto manual" });
      }

      // Si no fue 1 ni 2, probamos si escribió directamente el nombre o código de otro proyecto
      const proyectoNuevo = await resolverProyecto(supabase, msgText);
      if (proyectoNuevo) {
        const { error: errUpdate } = await supabase
          .from("registros_pendientes")
          .update({
            proyecto_id: proyectoNuevo.id,
            estado: "esperando_rol",
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        if (errUpdate) {
          console.error("[registroHandler] Error guardando nuevo proyecto:", errUpdate.message);
          await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
          return res.status(500).json({ success: false });
        }

        await enviarMensajeWhatsApp(jid, phoneClean,
          `¡Excelente! Proyecto: *${proyectoNuevo.nombre_proyecto}*.\n\nAhora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
          !!audio,
          geminiKey
        );
        return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
      }

      // Evaluar si es omitir
      const esOmitir = /no s[eé]|no se|no lo se|no tengo|salta|omit/i.test(msgText);
      if (esOmitir) {
        await supabase
          .from("registros_pendientes")
          .update({
            proyecto_id: null,
            estado: "esperando_rol",
            created_at: new Date().toISOString()
          })
          .eq("whatsapp", phoneClean);

        await enviarMensajeWhatsApp(jid, phoneClean,
          `Continuaremos sin proyecto asignado (el Administrador lo asignará al aprobar tu solicitud).\n\nAhora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
          !!audio,
          geminiKey
        );
        return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
      }

      await enviarMensajeWhatsApp(jid, phoneClean,
        `⚠️ Por favor responde:\n1️⃣ Para confirmar el proyecto del equipo escaneado\n2️⃣ Para indicar que perteneces a otro proyecto\n\nO escribe el nombre o código exacto de tu proyecto.`,
        !!audio,
        geminiKey
      );
      return res.status(200).json({ success: true, message: "Esperando confirmación o proyecto" });
    }

    // Flujo estándar cuando proyecto_id es null (sin equipo previo)
    const proyecto = await resolverProyecto(supabase, msgText);

    if (!proyecto) {
      const esOmitir = /no s[eé]|no se|no lo se|no tengo|salta|omit/i.test(msgText);
      if (!esOmitir) {
        await enviarMensajeWhatsApp(jid, phoneClean,
          `⚠️ No logré identificar ese proyecto. Puedes intentar de nuevo con el nombre o código exacto, o escribir *"no sé"* para continuar sin asignarlo — el Administrador lo asignará al aprobar tu solicitud.`,
          !!audio,
          geminiKey
        );
        return res.status(200).json({ success: true, message: "Esperando proyecto" });
      }
    }

    const { error: errUpdate } = await supabase
      .from("registros_pendientes")
      .update({
        proyecto_id: proyecto?.id || null,
        estado: "esperando_rol",
        created_at: new Date().toISOString()
      })
      .eq("whatsapp", phoneClean);

    if (errUpdate) {
      console.error("[registroHandler] Error guardando proyecto:", errUpdate.message);
      await enviarMensajeWhatsApp(jid, phoneClean, `❌ Ocurrió un error al procesar tu solicitud. Por favor intenta más tarde.`, !!audio, geminiKey);
      return res.status(500).json({ success: false });
    }

    const confirmacionProyecto = proyecto ? `Proyecto: *${proyecto.nombre_proyecto}*.\n\n` : "";
    await enviarMensajeWhatsApp(jid, phoneClean,
      `¡Gracias! ${confirmacionProyecto}Ahora selecciona tu rol respondiendo con el número correspondiente:\n\n${MENU_ROLES}`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, action: "ESPERANDO_ROL" });
  }

  // Caso 4: Esperando selección de rol (estado === "esperando_rol")
  if (registroPendiente.estado === "esperando_rol") {
    const seleccion = msgText.trim();
    const rolSeleccionado = ROLES_MAPA[seleccion];

    if (!rolSeleccionado) {
      await enviarMensajeWhatsApp(jid, phoneClean,
        `⚠️ *Selección inválida.*\n\nPor favor, responde únicamente con el número correspondiente a tu rol:\n\n${MENU_ROLES}\n\n_Si tu rol es Supervisor o Jefe de Área, indícaselo directamente al Administrador — esos roles no se autoasignan por este medio._`,
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

  // Caso 5: Solicitud ya está pendiente de aprobación por el Admin
  if (registroPendiente.estado === "pendiente") {
    await enviarMensajeWhatsApp(jid, phoneClean,
      `⏳ *Tu solicitud sigue pendiente*\n\nHola *${registroPendiente.nombre_completo}*, tu solicitud de registro como *${registroPendiente.rol_solicitado}* está siendo revisada por un Administrador.\n\nTe notificaremos por este medio inmediatamente después de ser aprobada.`,
      !!audio,
      geminiKey
    );
    return res.status(200).json({ success: true, message: "Solicitud pendiente" });
  }

  // Caso 6: Solicitud rechazada
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
