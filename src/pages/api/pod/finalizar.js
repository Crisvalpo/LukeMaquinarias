import { createAdminClient } from "../../../lib/supabase-server";
import { enviarMensajeWhatsApp } from "../../../lib/bot/services/messageService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();

  // La fecha objetivo (por defecto mañana, o la enviada desde el front)
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fechaPOD = req.body?.fecha || req.query?.fecha || manana.toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const proyectoIdFiltro = req.body?.proyecto_id || req.query?.proyecto_id || null;

  // Formatear fecha amigable
  const [y, m, d] = fechaPOD.split("-");
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  const fechaStr = `${dias[fechaObj.getDay()]} ${d} ${meses[Number(m) - 1]} ${y}`;

  try {
    // 1. Obtener especialidades (mapa id → nombre)
    const { data: especialidades } = await supabase
      .from("especialidades")
      .select("id, nombre_oficial");
    const especialidadesMap = new Map((especialidades || []).map(e => [e.id, e.nombre_oficial]));

    // 2. Obtener todos los bloques del día planificado con detalle completo
    const { data: todosBloques, error: errBloques } = await supabase
      .from("planificacion_bloques_pod")
      .select(`
        id, hora_inicio, hora_fin, actividad_especifica, especialidad_id,
        equipos ( id, codigo_interno, descripcion_equipo, plataforma_estado, plataforma_detalle, plataforma_especialidad_id, proyecto_actual_id ),
        supervisor:personal!planificacion_bloques_pod_supervisor_id_fkey ( id, nombre_completo, whatsapp ),
        proyectos:equipos ( proyecto_actual_id, proyectos ( codigo_cc, nombre_proyecto ) )
      `)
      .eq("fecha", fechaPOD)
      .order("hora_inicio", { ascending: true });

    if (errBloques) throw new Error(`Error obteniendo bloques: ${errBloques.message}`);

    const bloques = proyectoIdFiltro
      ? (todosBloques || []).filter(b => b.equipos?.proyecto_actual_id === proyectoIdFiltro)
      : (todosBloques || []);

    if (!bloques || bloques.length === 0) {
      return res.status(200).json({ success: true, message: `No hay bloques planificados para ${fechaStr}.`, alertas_enviadas: 0 });
    }

    // 3. ── PROTECCIÓN ANTI-BANEO WhatsApp ──
    // Considera conectados a quienes participaron hoy o para la fecha planificada
    const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
    const { data: participantesSesion } = await supabase
      .from("pod_sesion_participantes")
      .select("personal_id")
      .or(`fecha.eq.${fechaPOD},fecha.eq.${hoy}`);

    const idsConVentana24h = new Set((participantesSesion || []).map(p => p.personal_id));

    // 4. Agrupar bloques por supervisor
    const porSupervisor = new Map();
    for (const bloque of bloques) {
      if (!bloque.supervisor?.id) continue;
      if (!porSupervisor.has(bloque.supervisor.id)) {
        porSupervisor.set(bloque.supervisor.id, { supervisor: bloque.supervisor, bloques: [] });
      }
      porSupervisor.get(bloque.supervisor.id).bloques.push(bloque);
    }

    let alertasEnviadas = 0;
    const equiposPlatAlertados = new Set();
    const sinContacto = []; // supervisores con bloques pero sin ventana 24h activa

    // 5. Enviar resumen a cada supervisor que participó en la POD de hoy
    for (const [, { supervisor, bloques: bloquesSuper }] of porSupervisor) {

      // ── Saltar si no tiene ventana de 24h activa ──
      if (!idsConVentana24h.has(supervisor.id)) {
        sinContacto.push({
          nombre_completo: supervisor.nombre_completo,
          whatsapp: supervisor.whatsapp || null,
          bloques_asignados: bloquesSuper.length,
          motivo: "No participó en la sesión POD del día (sin ventana 24h activa)",
        });
        continue;
      }

      if (!supervisor.whatsapp) {
        sinContacto.push({
          nombre_completo: supervisor.nombre_completo,
          whatsapp: null,
          bloques_asignados: bloquesSuper.length,
          motivo: "Sin número de WhatsApp registrado",
        });
        continue;
      }

      // Obtener proyecto del primer bloque
      const proyectoCodigo = bloquesSuper[0]?.proyectos?.proyectos?.codigo_cc || "";
      const proyectoNombre = bloquesSuper[0]?.proyectos?.proyectos?.nombre_proyecto || "";

      // Construir mensaje de resumen
      let msg = `📋 *Resumen POD — ${fechaStr}*\n`;
      if (proyectoCodigo) msg += `🏗 ${proyectoCodigo}${proyectoNombre ? ` — ${proyectoNombre}` : ""}\n`;
      msg += `\nHola *${supervisor.nombre_completo}*, tus asignaciones para mañana:\n`;

      for (const b of bloquesSuper) {
        const ini = b.hora_inicio?.slice(0, 5) || "--:--";
        const fin = b.hora_fin?.slice(0, 5) || "--:--";
        const equipo = b.equipos?.codigo_interno || "?";
        const desc = b.equipos?.descripcion_equipo ? `(${b.equipos.descripcion_equipo})` : "";
        const esp = especialidadesMap.get(b.especialidad_id) || "";
        const act = b.actividad_especifica ? `\n   📌 _${b.actividad_especifica}_` : "";

        // Detectar alerta de plataforma en este equipo
        let alertaPlataforma = "";
        const eqId = b.equipos?.id;
        if (b.equipos?.plataforma_estado === "Cargada" && eqId && !equiposPlatAlertados.has(eqId)) {
          const espCargada = especialidadesMap.get(b.equipos.plataforma_especialidad_id) || "otra especialidad";
          if (b.equipos.plataforma_especialidad_id && b.equipos.plataforma_especialidad_id !== b.especialidad_id) {
            alertaPlataforma = `\n   ⚠️ _Plataforma cargada de ${espCargada} — coordine descarga_`;
            equiposPlatAlertados.add(eqId);
          }
        }

        msg += `\n🔧 *${ini}–${fin}* | ${equipo} ${desc}\n   🏷 ${esp}${act}${alertaPlataforma}`;
      }

      msg += `\n\n¡Buena jornada! 💪 Cualquier novedad responde por acá.`;

      await enviarMensajeWhatsApp(null, supervisor.whatsapp, msg, false, process.env.GEMINI_API_KEY);
      alertasEnviadas++;
    }

    return res.status(200).json({
      success: true,
      message: `POD inicializado. Resúmenes enviados a ${alertasEnviadas} supervisor${alertasEnviadas !== 1 ? "es" : ""}.`,
      alertas_enviadas: alertasEnviadas,
      sin_contacto: sinContacto,
      sin_contacto_total: sinContacto.length,
      fecha_pod: fechaPOD,
    });

  } catch (error) {
    console.error("[finalizar-pod] Error:", error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message });
  }
}
