import { createAdminClient } from "../../lib/supabase-server";

const BRIDGE_URL = process.env.WA_BRIDGE_URL || "http://localhost:3025";

async function enviarMensaje(phone, texto) {
  try {
    const formattedNum = phone.includes("@")
      ? phone
      : `${phone.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

    await fetch(`${BRIDGE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: formattedNum, text: texto }),
    });
  } catch (err) {
    console.error("[api/registros] Error enviando WhatsApp de notificación:", err.message);
  }
}

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("registros_pendientes")
        .select("*")
        .not("nombre_completo", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (e) {
      console.error("[api/registros] Error al obtener registros:", e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    const { action, id, rut, nombre_completo, rol_solicitado, nota_rechazo, obra_actual_id } = req.body;

    if (!id || !action) {
      return res.status(400).json({ success: false, message: "Falta id o action en el body" });
    }

    try {
      // 1. Obtener la solicitud actual
      const { data: registro, error: errGet } = await supabase
        .from("registros_pendientes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (errGet || !registro) {
        return res.status(404).json({ success: false, message: "Solicitud no encontrada" });
      }

      if (action === "aprobar") {
        if (!rut || !rut.trim()) {
          return res.status(400).json({ success: false, message: "El RUT es obligatorio para aprobar" });
        }

        const nombreFinal = nombre_completo || registro.nombre_completo;
        const rolFinal = rol_solicitado || registro.rol_solicitado || "Operador";

        // A. Insertar en personal
        const { error: errInsert } = await supabase
          .from("personal")
          .insert({
            rut: rut.trim(),
            nombre_completo: nombreFinal.trim(),
            whatsapp: registro.whatsapp,
            rol: rolFinal,
            activo: true,
            obra_actual_id: obra_actual_id || null
          });

        if (errInsert) {
          console.error("[api/registros] Error insertando personal:", errInsert.message);
          return res.status(500).json({ success: false, error: `Error al crear personal: ${errInsert.message}` });
        }

        // B. Actualizar solicitud
        const { error: errUpdate } = await supabase
          .from("registros_pendientes")
          .update({
            estado: "aprobado",
            nombre_completo: nombreFinal,
            rol_solicitado: rolFinal
          })
          .eq("id", id);

        if (errUpdate) throw errUpdate;

        // C. Enviar WhatsApp de bienvenida
        const mensajeBienvenida = `👷‍♂️ *¡Tu solicitud ha sido Aprobada!* 🎉\n\nHola *${nombreFinal}*, el Administrador ha aprobado tu registro como *${rolFinal}* en LukeEquipos.\n\nPara iniciar tu jornada diaria, por favor escanea el código QR del equipo o escribe:\n\n*REPORTE:CODIGO_EQUIPO*\n\nEjemplo: REPORTE:EIMI00387`;
        await enviarMensaje(registro.whatsapp, mensajeBienvenida);

        return res.status(200).json({ success: true, message: "Solicitud aprobada y personal creado" });
      }

      if (action === "rechazar") {
        // A. Actualizar solicitud
        const { error: errUpdate } = await supabase
          .from("registros_pendientes")
          .update({
            estado: "rechazado",
            nota_rechazo: nota_rechazo || "No cumple con los requisitos."
          })
          .eq("id", id);

        if (errUpdate) throw errUpdate;

        // B. Enviar WhatsApp de rechazo
        const mensajeRechazo = `❌ *Solicitud de Registro Rechazada*\n\nHola *${registro.nombre_completo || "Usuario"}*, tu solicitud de registro en LukeEquipos ha sido rechazada por el Administrador.\n\n*Motivo:* ${nota_rechazo || "No cumple con los requisitos de la faena."}\n\nSi deseas volver a solicitar el registro, puedes responder a este chat indicando tu *Nombre Completo*.`;
        await enviarMensaje(registro.whatsapp, mensajeRechazo);

        return res.status(200).json({ success: true, message: "Solicitud rechazada" });
      }

      return res.status(400).json({ success: false, message: "Acción no válida. Usar 'aprobar' o 'rechazar'" });
    } catch (e) {
      console.error("[api/registros] Error en procesamiento:", e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
