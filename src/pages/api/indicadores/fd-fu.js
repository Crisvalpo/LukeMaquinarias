import { createAdminClient } from "../../../lib/supabase-server";

// Factor de Disponibilidad (FD) = horas disponibles / horas presentes.
// Factor de Utilización (FU) = horas trabajadas / horas disponibles.
// Ver EIM-PRO-OFT-001: FD < 80% por 3+ semanas o FU < 60% requieren análisis.
const UMBRAL_FD = 80;
const UMBRAL_FU = 60;
const ESTADOS = ["Trabajando", "Disponible", "En Colacion", "Detenido por Falla"];

function fechaConOffset(base, offsetDias) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + offsetDias);
  return d.toLocaleDateString("sv-SE");
}

// Lunes (America/Santiago) de la semana que contiene `fecha`.
function lunesDeSemana(fecha) {
  const d = new Date(fecha + "T12:00:00");
  const diaSemana = d.getDay(); // 0=Dom ... 6=Sab
  const offsetALunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  return fechaConOffset(fecha, offsetALunes);
}

// Suma, por estado, la duración de cada intervalo entre eventos consecutivos.
// El último evento de la jornada (el cierre) no genera intervalo propio.
function sumarIntervalos(eventosOrdenados, totales) {
  for (let i = 0; i < eventosOrdenados.length - 1; i++) {
    const inicio = new Date(eventosOrdenados[i].hora_evento).getTime();
    const fin = new Date(eventosOrdenados[i + 1].hora_evento).getTime();
    const horas = Math.max(0, (fin - inicio) / 3_600_000);
    const estado = eventosOrdenados[i].estado_hito;
    if (totales[estado] !== undefined) totales[estado] += horas;
  }
}

function redondear(n) {
  return Math.round(n * 10) / 10;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();
  const { proyecto_id, equipo_id } = req.query;
  const fechaRef = req.query.fecha || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const numSemanas = Math.min(Math.max(parseInt(req.query.semanas, 10) || 1, 1), 4);

  const lunesActual = lunesDeSemana(fechaRef);
  const semanas = [];
  for (let i = numSemanas - 1; i >= 0; i--) {
    const inicio = fechaConOffset(lunesActual, -7 * i);
    semanas.push({ inicio, fin: fechaConOffset(inicio, 6) });
  }
  const desde = semanas[0].inicio;
  const hasta = semanas[semanas.length - 1].fin;

  try {
    let queryEquipos = supabase.from("equipos").select("id, codigo_interno, descripcion_equipo, proyecto_actual_id");
    if (proyecto_id) queryEquipos = queryEquipos.eq("proyecto_actual_id", proyecto_id);
    if (equipo_id) queryEquipos = queryEquipos.eq("id", equipo_id);

    const { data: equiposList, error: errEquipos } = await queryEquipos;
    if (errEquipos) throw errEquipos;

    if (!equiposList || equiposList.length === 0) {
      return res.status(200).json({ success: true, data: [], umbral_fd: UMBRAL_FD, umbral_fu: UMBRAL_FU });
    }

    // Solo jornadas cerradas: una jornada abierta no tiene evento de cierre
    // que delimite su último intervalo.
    let queryReportes = supabase
      .from("reportes_diarios")
      .select("id, fecha, equipo_id, eventos_jornada(estado_hito, hora_evento)")
      .not("horometro_final", "is", null)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    // Solo se acota por equipo_id si `equiposList` ya viene filtrado (por proyecto_id
    // o equipo_id) — de lo contrario son todos los equipos y un .in() con cientos de
    // UUIDs excede el largo máximo de URL que soporta PostgREST.
    if (proyecto_id || equipo_id) {
      queryReportes = queryReportes.in("equipo_id", equiposList.map(e => e.id));
    }

    const { data: reportes, error: errReportes } = await queryReportes;
    if (errReportes) throw errReportes;

    const reportesPorEquipo = {};
    for (const r of reportes || []) {
      (reportesPorEquipo[r.equipo_id] ||= []).push(r);
    }

    const resultado = equiposList.map(eq => {
      const reportesEquipo = reportesPorEquipo[eq.id] || [];

      const semanasCalc = semanas.map(({ inicio, fin }) => {
        const totales = { Trabajando: 0, Disponible: 0, "En Colacion": 0, "Detenido por Falla": 0 };

        for (const r of reportesEquipo) {
          if (r.fecha < inicio || r.fecha > fin) continue;
          const eventos = [...(r.eventos_jornada || [])].sort(
            (a, b) => new Date(a.hora_evento) - new Date(b.hora_evento)
          );
          sumarIntervalos(eventos, totales);
        }

        const presentes = ESTADOS.reduce((acc, k) => acc + totales[k], 0);
        const disponibles = presentes - totales["Detenido por Falla"];
        const trabajadas = totales["Trabajando"];
        const fd = presentes > 0 ? (disponibles / presentes) * 100 : null;
        const fu = disponibles > 0 ? (trabajadas / disponibles) * 100 : null;

        return {
          inicio_semana: inicio,
          horas_presentes: redondear(presentes),
          horas_disponibles: redondear(disponibles),
          horas_trabajadas: redondear(trabajadas),
          fd: fd !== null ? redondear(fd) : null,
          fu: fu !== null ? redondear(fu) : null,
        };
      });

      const rachaFdBaja =
        semanasCalc.length >= 3 &&
        semanasCalc.slice(-3).every(s => s.fd !== null && s.fd < UMBRAL_FD);

      return {
        equipo_id: eq.id,
        codigo_interno: eq.codigo_interno,
        descripcion_equipo: eq.descripcion_equipo,
        semanas: semanasCalc,
        racha_fd_baja: rachaFdBaja,
      };
    });

    return res.status(200).json({ success: true, data: resultado, umbral_fd: UMBRAL_FD, umbral_fu: UMBRAL_FU });
  } catch (e) {
    console.error("[api/indicadores/fd-fu] Error:", e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
