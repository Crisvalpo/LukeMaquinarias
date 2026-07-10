import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";

function fechaOffsetStr(base, offset) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
}

function formatFechaCorta(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const navBtnStyle = {
  background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)",
  color: "var(--color-text-muted)", borderRadius: "6px", padding: "6px 8px",
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function badgePorcentaje(valor, umbral) {
  if (valor === null) {
    return <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>—</span>;
  }
  const bajoUmbral = valor < umbral;
  return (
    <span style={{
      background: bajoUmbral ? "#fee2e2" : "#dcfce7",
      color: bajoUmbral ? "#c21a25" : "#16a34a",
      borderRadius: "12px", padding: "3px 10px", fontSize: "12px", fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
    }}>
      {valor}%
    </span>
  );
}

export default function IndicadoresTab({ currentUser }) {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const [fechaRef, setFechaRef] = useState(hoy);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [umbrales, setUmbrales] = useState({ fd: 80, fu: 60 });

  const proyectoActivoId = currentUser?.proyecto_actual_id || null;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ semanas: "4", fecha: fechaRef });
      if (proyectoActivoId) params.set("proyecto_id", proyectoActivoId);
      const r = await fetch(`/api/indicadores/fd-fu?${params}`);
      const json = await r.json();
      if (json.success) {
        setData(json.data || []);
        setUmbrales({ fd: json.umbral_fd, fu: json.umbral_fu });
      }
    } catch (e) {
      console.error("[IndicadoresTab] Error al cargar:", e.message);
    } finally {
      setLoading(false);
    }
  }, [fechaRef, proyectoActivoId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Todos los equipos comparten el mismo rango de semanas; se toma la última (la solicitada).
  const semanaMostrada = data[0]?.semanas?.[data[0].semanas.length - 1];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
          <TrendingUp size={22} /> Indicadores FD / FU
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setFechaRef(f => fechaOffsetStr(f, -7))} style={navBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", minWidth: "170px", textAlign: "center" }}>
            {semanaMostrada
              ? `Semana ${formatFechaCorta(semanaMostrada.inicio_semana)} – ${formatFechaCorta(fechaOffsetStr(semanaMostrada.inicio_semana, 6))}`
              : (loading ? "Cargando…" : "Sin datos")}
          </div>
          <button onClick={() => setFechaRef(f => fechaOffsetStr(f, 7))} style={navBtnStyle}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--color-text-muted)" }}>
        FD (Factor de Disponibilidad) = horas disponibles / horas presentes · umbral {umbrales.fd}%.
        FU (Factor de Utilización) = horas trabajadas / horas disponibles · umbral {umbrales.fu}%.
        Solo se cuentan jornadas ya cerradas.
      </p>

      <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-container)", background: "var(--bg-sidebar)" }}>
              {["Equipo", "Horas Presentes", "Horas Disponibles", "Horas Trabajadas", "FD", "FU"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(eq => {
              const s = eq.semanas[eq.semanas.length - 1];
              const sinDatos = s.horas_presentes === 0;
              return (
                <tr key={eq.equipo_id} style={{ borderBottom: "1px solid var(--border-container)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-text)" }}>{eq.codigo_interno}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{eq.descripcion_equipo}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {sinDatos ? "—" : `${s.horas_presentes} h`}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {sinDatos ? "—" : `${s.horas_disponibles} h`}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {sinDatos ? "—" : `${s.horas_trabajadas} h`}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {badgePorcentaje(s.fd, umbrales.fd)}
                    {eq.racha_fd_baja && (
                      <div title="FD bajo el umbral 3 semanas seguidas" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "10px", color: "#c21a25", fontWeight: 700 }}>
                        <AlertTriangle size={11} /> 3 semanas bajo umbral
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {badgePorcentaje(s.fu, umbrales.fu)}
                  </td>
                </tr>
              );
            })}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  No hay equipos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
