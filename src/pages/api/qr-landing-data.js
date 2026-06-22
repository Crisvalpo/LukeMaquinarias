import { createAdminClient } from "../../lib/supabase-server";

function formatRut(val) {
  if (!val) return "";
  const clean = val.replace(/[^0-9kK]/g, "").slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  let formattedBody = "";
  let count = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    formattedBody = body.charAt(i) + formattedBody;
    count++;
    if (count === 3 && i > 0) {
      formattedBody = "." + formattedBody;
      count = 0;
    }
  }
  return `${formattedBody}-${dv}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();
  const { codigo, identificador } = req.query;

  if (!codigo) {
    return res.status(400).json({ success: false, message: "Código de equipo es requerido" });
  }

  try {
    // 1. Obtener datos del equipo
    const { data: equipo, error: errorEquipo } = await supabase
      .from("equipos")
      .select("id, codigo_interno, descripcion_equipo, proveedor, seguimiento_completo, latitud_actual, longitud_actual, ultima_ubicacion_fecha, ultimo_horometro, ultimo_odometro, pauta_preventiva_activa, tipo_seguimiento, combustible_nivel_porcentaje, proyectos(nombre_proyecto, codigo_cc), capacidad_estanque_litros")
      .eq("codigo_interno", codigo)
      .maybeSingle();

    if (errorEquipo) {
      return res.status(500).json({ success: false, error: errorEquipo.message });
    }

    if (!equipo) {
      return res.status(404).json({ success: false, message: "Equipo no encontrado" });
    }

    // 2. Obtener el número de teléfono del bot de WhatsApp
    const { data: configBot } = await supabase
      .from("configuracion_bot")
      .select("valor")
      .eq("clave", "bot_phone")
      .maybeSingle();
    const botPhone = configBot?.valor || "56911110001";

    let operador = null;
    let reportes = [];

    // 3. Si se proporciona un identificador, obtener datos del operador
    if (identificador && identificador.trim() !== "") {
      const cleanIdentificador = identificador.trim();
      const formattedRut = formatRut(cleanIdentificador);
      
      const { data: op, error: errorOp } = await supabase
        .from("personal")
        .select("id, rut, nombre_completo, whatsapp, rol, foto_url")
        .or(`rut.eq.${cleanIdentificador},rut.eq.${formattedRut},whatsapp.eq.${cleanIdentificador},whatsapp.eq.+${cleanIdentificador}`)
        .eq("activo", true)
        .maybeSingle();

      if (errorOp) {
        console.error("Error obteniendo operador:", errorOp.message);
      } else if (op) {
        operador = op;

        // 4. Obtener los últimos 5 reportes consolidados en PDF de este operador
        const { data: repList, error: errorRep } = await supabase
          .from("reportes_diarios")
          .select("id, fecha, pdf_url, equipos(codigo_interno)")
          .eq("operador_id", operador.id)
          .not("pdf_url", "is", null)
          .order("fecha", { ascending: false })
          .limit(5);

        if (errorRep) {
          console.error("Error obteniendo reportes pasados:", errorRep.message);
        } else {
          reportes = repList || [];
        }
      }
    }

    return res.status(200).json({
      success: true,
      equipo,
      operador,
      reportes,
      botPhone
    });

  } catch (err) {
    console.error("Error en qr-landing-data API:", err.message);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}
