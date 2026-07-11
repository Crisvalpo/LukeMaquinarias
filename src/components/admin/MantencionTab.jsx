import React, { useState, useEffect, useCallback } from "react";
import { Wrench, CheckCircle2 } from "lucide-react";

const ESTADO_BADGE = {
  ok: { bg: "#dcfce7", color: "#16a34a", label: "OK" },
  corresponde_ahora: { bg: "#fef3c7", color: "#d97706", label: "Corresponde ahora" },
  fuera_de_tolerancia: { bg: "#fee2e2", color: "#c21a25", label: "Fuera de tolerancia" },
};

export default function MantencionTab({ currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(null);
  const [form, setForm] = useState({ tipo_pm: "PM1", fecha: "", lectura_al_momento: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const proyectoActivoId = currentUser?.proyecto_actual_id || null;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (proyectoActivoId) params.set("proyecto_id", proyectoActivoId);
      const r = await fetch(`/api/indicadores/mantencion?${params}`);
      const json = await r.json();
      if (json.success) setData(json.data || []);
    } catch (e) {
      console.error("[MantencionTab] Error al cargar:", e.message);
    } finally {
      setLoading(false);
    }
  }, [proyectoActivoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirRegistro = (eq) => {
    setRegistrando(eq);
    setForm({
      tipo_pm: eq.proximo_pm || "PM1",
      fecha: new Date().toISOString().slice(0, 10),
      lectura_al_momento: eq.lectura_actual ?? "",
      notas: "",
    });
  };

  const confirmarRegistro = async () => {
    if (!registrando) return;
    setSaving(true);
    try {
      const r = await fetch("/api/mantenciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: registrando.equipo_id,
          tipo_pm: form.tipo_pm,
          fecha: form.fecha,
          lectura_al_momento: Number(form.lectura_al_momento),
          responsable_id: currentUser?.id && currentUser.id !== "admin-root" ? currentUser.id : null,
          notas: form.notas || null,
        }),
      });
      const json = await r.json();
      if (json.success) {
        setRegistrando(null);
        cargar();
      }
    } catch (e) {
      console.error("[MantencionTab] Error al registrar PM:", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
          <Wrench size={22} /> Mantención (PM1-PM4)
        </h1>
      </div>

      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--color-text-muted)" }}>
        Solo se muestran equipos con perfil de mantención configurado (umbrales PM1-PM4 en el modal de edición de Equipos, o pidiéndoselo a jAIme por voz/texto).
        El faltante se expresa en la unidad de control del equipo (horas u km, según el tipo de seguimiento).
      </p>

      <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-container)", background: "var(--bg-sidebar)" }}>
              {["Equipo", "Lectura Actual", "Próximo PM", "Faltante", "Estado", "Acciones"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(eq => {
              const badge = ESTADO_BADGE[eq.estado] || ESTADO_BADGE.ok;
              return (
                <tr key={eq.equipo_id} style={{ borderBottom: "1px solid var(--border-container)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-text)" }}>{eq.codigo_interno}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{eq.descripcion_equipo}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {eq.lectura_actual} {eq.unidad}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>{eq.proximo_pm}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--color-text-muted)" }}>
                    {eq.faltante >= 0 ? `faltan ${eq.faltante}` : `atrasado ${Math.abs(eq.faltante)}`} {eq.unidad}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: "12px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => abrirRegistro(eq)}
                      style={{ background: "#16a34a", border: "none", color: "white", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <CheckCircle2 size={12} /> Marcar PM ejecutada
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  No hay equipos con perfil de mantención configurado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {registrando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card, #fff)", borderRadius: "16px", padding: "24px", width: "min(420px, 94vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 800, color: "var(--color-text)" }}>
              Registrar PM ejecutada — {registrando.codigo_interno}
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Tipo de PM</label>
              <select
                value={form.tipo_pm}
                onChange={e => setForm(f => ({ ...f, tipo_pm: e.target.value }))}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", fontSize: "13px", boxSizing: "border-box" }}
              >
                {["PM1", "PM2", "PM3", "PM4"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Fecha</label>
              <input
                type="date" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Lectura al momento ({registrando.unidad})
              </label>
              <input
                type="number" value={form.lectura_al_momento}
                onChange={e => setForm(f => ({ ...f, lectura_al_momento: e.target.value }))}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Notas (opcional)</label>
              <input
                type="text" value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setRegistrando(null)} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                Cancelar
              </button>
              <button
                onClick={confirmarRegistro}
                disabled={saving || !form.lectura_al_momento}
                style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, opacity: (saving || !form.lectura_al_momento) ? 0.6 : 1 }}
              >
                {saving ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
