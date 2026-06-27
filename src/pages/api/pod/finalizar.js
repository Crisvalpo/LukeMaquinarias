import { createAdminClient } from "../../../lib/supabase-server";
import { enviarMensajeWhatsApp } from "../../../lib/bot/services/messageService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  // Validar secreto de administración
  const authHeader = req.headers["authorization"];
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ success: false, message: "No autorizado" });
  }

  const supabase = createAdminClient();
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });

  try {
    // 1. Obtener todas las especialidades para mapear IDs a nombres
    const { data: especialidades } = await supabase
      .from("especialidades")
      .select("id, nombre_oficial");
    
    const especialidadesMap = new Map(especialidades?.map(e => [e.id, e.nombre_oficial]) || []);

    // 2. Obtener bloques de hoy con detalles de equipos y supervisores
    const { data: bloques, error: errBloques } = await supabase
      .from("planificacion_bloques_pod")
      .select(`
        *,
        equipo:equipo_id(*),
        especialidad:especialidad_id(*),
        supervisor:supervisor_id(*)
      `)
      .eq("fecha", hoy)
      .order("hora_inicio", { ascending: true });

    if (errBloques) {
      throw new Error(`Error obteniendo bloques: ${errBloques.message}`);
    }

    if (!bloques || bloques.length === 0) {
      return res.status(200).json({ success: true, message: "No hay bloques planificados para hoy." });
    }

    let alertasEnviadas = 0;
    const equiposProcesados = new Set();

    // 3. Evaluar cruce de plataforma cargada por cada bloque
    for (const bloque of bloques) {
      const equipo = bloque.equipo;
      if (!equipo) continue;
      
      // Evitar enviar alertas duplicadas para el mismo equipo en el día si tiene múltiples bloques
      if (equiposProcesados.has(equipo.id)) continue;

      if (equipo.plataforma_estado === "Cargada") {
        const bloqueEspId = bloque.especialidad_id;
        const platEspId = equipo.plataforma_especialidad_id;

        // Si la especialidad asignada en el bloque actual es distinta a la especialidad dueña de la carga
        if (platEspId && platEspId !== bloqueEspId) {
          equiposProcesados.add(equipo.id);

          const nombreEspCargada = especialidadesMap.get(platEspId) || "Otra Especialidad";
          const supervisor = bloque.supervisor;

          if (supervisor && supervisor.whatsapp) {
            const mensajeAlerta = `⚠️ *Atención*: El equipo asignado a su área (*${bloque.especialidad.nombre_oficial}*) para el primer bloque (*${equipo.descripcion_equipo}* - ${equipo.codigo_interno}) viene bloqueado con carga rezagada de *${nombreEspCargada}* (Detalle: ${equipo.plataforma_detalle || 'sin detalle'}). Tiempo estimado de descarga: 2 horas. Coordine el inicio con su personal.`;
            
            await enviarMensajeWhatsApp(null, supervisor.whatsapp, mensajeAlerta, false, process.env.GEMINI_API_KEY);
            alertasEnviadas++;
          }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: "POD Finalizado con éxito.", 
      alertas_enviadas: alertasEnviadas 
    });

  } catch (error) {
    console.error("[finalizar-pod] Error:", error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message });
  }
}
