import { createAdminClient } from "../../../lib/supabase-server";

// Defaults del procedimiento cuando el equipo no tiene tolerancia_pm configurada.
const TOLERANCIA_DEFAULT_HORAS = 50;
const TOLERANCIA_DEFAULT_KM = 2000;

const TIERS = ["PM1", "PM2", "PM3", "PM4"];

function calcularProximaPM(equipo, ultimaMantencion) {
  const esVehiculo = equipo.tipo_seguimiento === "vehiculo";
  const lecturaActual = esVehiculo ? equipo.ultimo_odometro : equipo.ultimo_horometro;

  if (lecturaActual === null || lecturaActual === undefined) return null;

  const lecturaBase = ultimaMantencion ? ultimaMantencion.lectura_al_momento : 0;
  const avance = lecturaActual - lecturaBase;

  const umbrales = {
    PM1: equipo.pm1_umbral,
    PM2: equipo.pm2_umbral,
    PM3: equipo.pm3_umbral,
    PM4: equipo.pm4_umbral,
  };

  let mejor = null;
  for (const tier of TIERS) {
    const umbral = umbrales[tier];
    if (!umbral || umbral <= 0) continue;

    const proximoMultiplo = Math.ceil((avance + 0.0001) / umbral) * umbral;
    const faltante = proximoMultiplo - avance;

    if (mejor === null || faltante < mejor.faltante) {
      mejor = { tier, faltante };
    }
  }

  if (mejor === null) return null;

  const tolerancia = equipo.tolerancia_pm ?? (esVehiculo ? TOLERANCIA_DEFAULT_KM : TOLERANCIA_DEFAULT_HORAS);
  let estado;
  if (mejor.faltante < -tolerancia) estado = "fuera_de_tolerancia";
  else if (mejor.faltante <= tolerancia) estado = "corresponde_ahora";
  else estado = "ok";

  return {
    unidad: esVehiculo ? "km" : "horas",
    lectura_actual: lecturaActual,
    proximo_pm: mejor.tier,
    faltante: Math.round(mejor.faltante),
    estado,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();
  const { proyecto_id, equipo_id } = req.query;

  try {
    let queryEquipos = supabase
      .from("equipos")
      .select("id, codigo_interno, descripcion_equipo, tipo_seguimiento, ultimo_horometro, ultimo_odometro, pm1_umbral, pm2_umbral, pm3_umbral, pm4_umbral, tolerancia_pm, proyecto_actual_id")
      .not("proveedor", "ilike", "%EIMI%")
      .not("codigo_interno", "ilike", "EIMI%")
      .not("pm1_umbral", "is", null);

    if (proyecto_id) queryEquipos = queryEquipos.eq("proyecto_actual_id", proyecto_id);
    if (equipo_id) queryEquipos = queryEquipos.eq("id", equipo_id);

    const { data: equiposList, error: errEquipos } = await queryEquipos;
    if (errEquipos) throw errEquipos;

    if (!equiposList || equiposList.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const equipoIds = equiposList.map(e => e.id);
    const { data: mantenciones, error: errMant } = await supabase
      .from("mantenciones_ejecutadas")
      .select("equipo_id, tipo_pm, fecha, lectura_al_momento")
      .in("equipo_id", equipoIds)
      .order("fecha", { ascending: false })
      .order("lectura_al_momento", { ascending: false });
    if (errMant) throw errMant;

    const ultimaPorEquipo = {};
    for (const m of mantenciones || []) {
      if (!ultimaPorEquipo[m.equipo_id]) ultimaPorEquipo[m.equipo_id] = m;
    }

    const resultado = equiposList.map(eq => {
      const calculo = calcularProximaPM(eq, ultimaPorEquipo[eq.id] || null);
      return {
        equipo_id: eq.id,
        codigo_interno: eq.codigo_interno,
        descripcion_equipo: eq.descripcion_equipo,
        ultima_mantencion: ultimaPorEquipo[eq.id] || null,
        ...calculo,
      };
    }).filter(r => r.proximo_pm); // descarta equipos sin lectura disponible (horometro/odometro null)

    return res.status(200).json({ success: true, data: resultado });
  } catch (e) {
    console.error("[api/indicadores/mantencion] Error:", e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
