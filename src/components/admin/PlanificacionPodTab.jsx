import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, X, RefreshCw, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";

// ================================================================
// CONSTANTES
// ================================================================
const HORAS_JORNADA = Array.from({ length: 12 }, (_, i) => {
  const h = i + 7; // 07:00 a 18:00
  return `${String(h).padStart(2, "0")}:00`;
});

const COLOR_FALLBACK = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const inputStyle = {
  width: "100%",
  background: "var(--bg-input)",
  border: "1px solid var(--border-input)",
  borderRadius: "var(--border-radius-sm)",
  color: "var(--color-input-text)",
  padding: "9px 12px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ================================================================
// HELPERS
// ================================================================
function horaToMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function getColorForEsp(espId, especialidades) {
  const esp = especialidades.find(e => e.id === espId);
  if (esp?.color) return esp.color;
  const idx = especialidades.findIndex(e => e.id === espId);
  return COLOR_FALLBACK[idx % COLOR_FALLBACK.length] || "#6b7280";
}

function formatFecha(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-");
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return `${dias[date.getDay()]} ${d} ${meses[Number(m) - 1]} ${y}`;
}

function dateOffsetStr(base, offset) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
}

// ================================================================
// SUB-COMPONENTE: Modal de creación/edición de bloque
// ================================================================
function BloqueModal({ bloque, equipos, supervisores, especialidades, fechaPOD, onClose, onSave, saving }) {
  const esNuevo = !bloque?.id;

  const [form, setForm] = useState({
    equipo_id: bloque?.equipos?.id || "",
    hora_inicio: bloque?.hora_inicio?.slice(0, 5) || "07:00",
    hora_fin: bloque?.hora_fin?.slice(0, 5) || "08:00",
    especialidad_id: bloque?.especialidades?.id || "",
    supervisor_id: bloque?.supervisor?.id || "",
    actividad_especifica: bloque?.actividad_especifica || "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const horasOpciones = HORAS_JORNADA.concat(["19:00", "20:00"]);

  const handleSubmit = () => {
    if (!form.equipo_id || !form.hora_inicio || !form.hora_fin || !form.especialidad_id || !form.supervisor_id) {
      alert("Completa todos los campos requeridos.");
      return;
    }
    if (horaToMinutos(form.hora_fin) <= horaToMinutos(form.hora_inicio)) {
      alert("La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    onSave({ ...form, id: bloque?.id, fecha: fechaPOD });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-card, #fff)", borderRadius: "16px", padding: "32px",
        width: "min(520px, 94vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        border: "1px solid var(--border-sidebar)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)" }}>
              {esNuevo ? "➕ Nuevo Bloque POD" : "✏️ Editar Bloque"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {formatFecha(fechaPOD)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Equipo */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Equipo *
            </label>
            <select
              value={form.equipo_id}
              onChange={e => set("equipo_id", e.target.value)}
              style={selectStyle}
            >
              <option value="">— Selecciona un equipo —</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigo_interno} — {eq.descripcion_equipo}
                  {eq.plataforma_estado === "Cargada" ? ` ⚠️ Cargada` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Horario */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                Hora Inicio *
              </label>
              <select value={form.hora_inicio} onChange={e => set("hora_inicio", e.target.value)} style={selectStyle}>
                {horasOpciones.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                Hora Fin *
              </label>
              <select value={form.hora_fin} onChange={e => set("hora_fin", e.target.value)} style={selectStyle}>
                {horasOpciones.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Especialidad */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Especialidad *
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select value={form.especialidad_id} onChange={e => set("especialidad_id", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                <option value="">— Selecciona especialidad —</option>
                {especialidades.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nombre_oficial}</option>
                ))}
              </select>
              {form.especialidad_id && (() => {
                const esp = especialidades.find(e => e.id === form.especialidad_id);
                const color = esp?.color || "#6b7280";
                return (
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: color, flexShrink: 0,
                    boxShadow: `0 0 0 3px ${color}40`,
                    border: `2px solid ${color}`,
                    transition: "all 0.2s",
                  }} title={esp?.nombre_oficial} />
                );
              })()}
            </div>
          </div>

          {/* Supervisor */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Supervisor Responsable *
            </label>
            <select value={form.supervisor_id} onChange={e => set("supervisor_id", e.target.value)} style={selectStyle}>
              <option value="">— Selecciona supervisor —</option>
              {supervisores.map(s => (
                <option key={s.id} value={s.id}>{s.nombre_completo}</option>
              ))}
            </select>
          </div>

          {/* Actividad (opcional) */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Actividad Específica <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional — se puede completar por WhatsApp)</span>
            </label>
            <input
              type="text"
              value={form.actividad_especifica}
              onChange={e => set("actividad_especifica", e.target.value)}
              placeholder="Ej: Instalación vigas eje 5 — Torre B"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "12px", marginTop: "28px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-input)",
            background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: 600,
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "10px 24px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700,
              display: "flex", alignItems: "center", gap: "8px",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {esNuevo ? "Crear Bloque" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL: PlanificacionPodTab
// ================================================================
export default function PlanificacionPodTab({ hookProps }) {
  const { equiposCompleto, personalCompleto, especialidades, showMsg, saving, setSaving } = hookProps;

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  // Por defecto, planificar para mañana (el ritual es al cierre de jornada)
  const manana = dateOffsetStr(hoy, 1);

  const [fechaPOD, setFechaPOD] = useState(manana);
  const [bloques, setBloques] = useState([]);
  const [loadingBloques, setLoadingBloques] = useState(false);
  const [modalBloque, setModalBloque] = useState(null); // null | {} | { bloque existente }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [enviandoPOD, setEnviandoPOD] = useState(false);
  const [vistaModo, setVistaModo] = useState("matriz"); // "matriz" | "lista"

  // Filtros
  const supervisores = (personalCompleto.data || []).filter(p =>
    p.rol === "Supervisor" || p.rol === "Jefe de Area"
  );
  const equiposList = equiposCompleto.data || [];
  const especialidadesList = especialidades.data || [];

  // ──────────── Carga de bloques ────────────
  const cargarBloques = useCallback(async () => {
    setLoadingBloques(true);
    try {
      const r = await fetch(`/api/pod/bloques?fecha=${fechaPOD}`);
      const json = await r.json();
      if (json.success) setBloques(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBloques(false);
    }
  }, [fechaPOD]);

  useEffect(() => { cargarBloques(); }, [cargarBloques]);

  // ──────────── Guardar bloque ────────────
  const handleSaveBloque = async (formData) => {
    setSaving(true);
    try {
      const method = formData.id ? "PATCH" : "POST";
      const r = await fetch("/api/pod/bloques", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await r.json();
      if (json.success) {
        showMsg(formData.id ? "✅ Bloque actualizado" : "✅ Bloque creado");
        setModalBloque(null);
        cargarBloques();
      } else {
        showMsg(`❌ ${json.error}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  // ──────────── Eliminar bloque ────────────
  const handleDeleteBloque = async (id) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/pod/bloques?id=${id}`, { method: "DELETE" });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Bloque eliminado");
        setConfirmDelete(null);
        cargarBloques();
      } else {
        showMsg(`❌ ${json.error}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  // ──────────── Inicializar POD (envío WA) ────────────
  const handleInicializarPOD = async () => {
    if (!window.confirm(`¿Inicializar el POD para el ${formatFecha(fechaPOD)}?\n\nSe enviará el mensaje "PARTICIPAR_POD" a los supervisores con bloques asignados.`)) return;
    setEnviandoPOD(true);
    try {
      const r = await fetch("/api/pod/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await r.json();
      if (json.success) {
        showMsg(`✅ POD inicializado — ${json.alertas_enviadas || 0} alertas enviadas`);
      } else {
        showMsg(`❌ ${json.message || json.error}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setEnviandoPOD(false);
    }
  };

  // ──────────── Cómputo de la Matriz ────────────
  // Equipos que tienen al menos 1 bloque en el día seleccionado
  const equiposConBloques = equiposList.filter(eq =>
    bloques.some(b => b.equipos?.id === eq.id)
  );

  // Para cada celda (equipo × hora), encontrar el bloque que cubre ese slot
  function getBloqueEnSlot(equipoId, horaSlot) {
    const minSlot = horaToMinutos(horaSlot);
    return bloques.find(b => {
      if (b.equipos?.id !== equipoId) return false;
      const ini = horaToMinutos(b.hora_inicio?.slice(0, 5) || "00:00");
      const fin = horaToMinutos(b.hora_fin?.slice(0, 5) || "00:00");
      return minSlot >= ini && minSlot < fin;
    }) || null;
  }

  // ──────────── Render ────────────
  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px" }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            📋 Planificación POD
          </h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            Asignación de equipos a especialidades y supervisores por bloques horarios
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Navegación de fecha */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)",
            borderRadius: "10px", padding: "6px 12px",
          }}>
            <button
              onClick={() => setFechaPOD(dateOffsetStr(fechaPOD, -1))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", padding: "2px" }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={14} style={{ color: "var(--color-primary, #10b981)" }} />
              <input
                type="date"
                value={fechaPOD}
                onChange={e => setFechaPOD(e.target.value)}
                style={{ background: "none", border: "none", outline: "none", fontSize: "13px", fontWeight: 700, color: "var(--color-text)", cursor: "pointer", fontFamily: "inherit" }}
              />
            </div>
            <button
              onClick={() => setFechaPOD(dateOffsetStr(fechaPOD, 1))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", padding: "2px" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Toggle vista */}
          <div style={{
            display: "flex", background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)",
            borderRadius: "8px", overflow: "hidden",
          }}>
            {["matriz", "lista"].map(modo => (
              <button key={modo} onClick={() => setVistaModo(modo)} style={{
                padding: "8px 14px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700,
                background: vistaModo === modo ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                color: vistaModo === modo ? "white" : "var(--color-text-muted)",
                transition: "all 0.2s",
                textTransform: "capitalize",
              }}>
                {modo === "matriz" ? "🗂 Matriz" : "☰ Lista"}
              </button>
            ))}
          </div>

          {/* Refrescar */}
          <button
            onClick={cargarBloques}
            disabled={loadingBloques}
            style={{
              padding: "9px 14px", borderRadius: "8px", border: "1px solid var(--border-input)",
              background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px",
            }}
          >
            <RefreshCw size={14} style={{ animation: loadingBloques ? "spin 1s linear infinite" : "none" }} />
            Refrescar
          </button>

          {/* Nuevo bloque */}
          <button
            onClick={() => setModalBloque({})}
            style={{
              padding: "9px 18px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
              fontSize: "13px", fontWeight: 700, boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
            }}
          >
            <Plus size={16} />
            Nuevo Bloque
          </button>

          {/* Inicializar POD */}
          <button
            onClick={handleInicializarPOD}
            disabled={enviandoPOD || bloques.length === 0}
            style={{
              padding: "9px 18px", borderRadius: "8px", border: "none",
              background: bloques.length === 0 ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: bloques.length === 0 ? "var(--color-text-muted)" : "white",
              cursor: bloques.length === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "13px", fontWeight: 700,
              boxShadow: bloques.length > 0 ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {enviandoPOD
              ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              : <Send size={16} />
            }
            Inicializar POD
          </button>
        </div>
      </div>

      {/* ===== BADGE DE FECHA ===== */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        background: fechaPOD === hoy
          ? "rgba(245, 158, 11, 0.12)"
          : fechaPOD < hoy
            ? "rgba(239, 68, 68, 0.08)"
            : "rgba(16, 185, 129, 0.1)",
        border: `1px solid ${fechaPOD === hoy ? "#f59e0b" : fechaPOD < hoy ? "#ef4444" : "#10b981"}40`,
        borderRadius: "8px", padding: "6px 14px", marginBottom: "24px",
        fontSize: "13px", fontWeight: 600,
        color: fechaPOD === hoy ? "#d97706" : fechaPOD < hoy ? "#dc2626" : "#059669",
      }}>
        <Clock size={13} />
        {fechaPOD === hoy && "📅 Planificando para HOY"}
        {fechaPOD === manana && "📅 Planificando para MAÑANA"}
        {fechaPOD !== hoy && fechaPOD !== manana && fechaPOD > hoy && `📅 ${formatFecha(fechaPOD)}`}
        {fechaPOD < hoy && `⚠️ Fecha pasada — ${formatFecha(fechaPOD)}`}
        <span style={{ fontWeight: 400 }}>— {bloques.length} bloque{bloques.length !== 1 ? "s" : ""} asignado{bloques.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ===== ESTADO VACÍO ===== */}
      {!loadingBloques && bloques.length === 0 && (
        <div style={{
          textAlign: "center", padding: "64px 32px",
          background: "var(--bg-sidebar)", borderRadius: "16px",
          border: "2px dashed var(--border-sidebar)",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", marginBottom: "8px" }}>
            Sin bloques planificados
          </div>
          <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
            Añade los primeros bloques de asignación de equipos para {formatFecha(fechaPOD)}.
          </div>
          <button
            onClick={() => setModalBloque({})}
            style={{
              padding: "12px 24px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: "8px",
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
            }}
          >
            <Plus size={16} /> Crear primer bloque
          </button>
        </div>
      )}

      {loadingBloques && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-muted)" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <div>Cargando planificación...</div>
        </div>
      )}

      {/* ===== VISTA MATRIZ ===== */}
      {!loadingBloques && bloques.length > 0 && vistaModo === "matriz" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            borderCollapse: "collapse", width: "100%", minWidth: "900px",
            background: "var(--bg-sidebar)", borderRadius: "16px", overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}>
            <thead>
              <tr>
                {/* Columna de equipo */}
                <th style={{
                  padding: "14px 18px", textAlign: "left", fontSize: "11px", fontWeight: 700,
                  color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px",
                  background: "var(--bg-sidebar)", borderBottom: "2px solid var(--border-sidebar)",
                  position: "sticky", left: 0, zIndex: 2, minWidth: "200px",
                }}>
                  Equipo
                </th>
                {HORAS_JORNADA.map(h => (
                  <th key={h} style={{
                    padding: "14px 8px", textAlign: "center", fontSize: "11px", fontWeight: 700,
                    color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
                    background: "var(--bg-sidebar)", borderBottom: "2px solid var(--border-sidebar)",
                    minWidth: "80px",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equiposConBloques.map((eq, rowIdx) => (
                <tr key={eq.id} style={{ background: rowIdx % 2 === 0 ? "var(--bg-card, white)" : "var(--bg-sidebar)" }}>
                  {/* Nombre equipo */}
                  <td style={{
                    padding: "12px 18px", borderBottom: "1px solid var(--border-sidebar)",
                    position: "sticky", left: 0, zIndex: 1,
                    background: rowIdx % 2 === 0 ? "var(--bg-card, white)" : "var(--bg-sidebar)",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-text)" }}>
                      {eq.codigo_interno}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {eq.descripcion_equipo?.slice(0, 30)}
                    </div>
                    {eq.plataforma_estado === "Cargada" && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        background: "rgba(245,158,11,0.15)", color: "#d97706",
                        borderRadius: "4px", padding: "1px 6px", fontSize: "10px", fontWeight: 700, marginTop: "4px",
                      }}>
                        <AlertTriangle size={9} /> Plataforma cargada
                      </div>
                    )}
                  </td>

                  {/* Celdas horarias */}
                  {HORAS_JORNADA.map(h => {
                    const bloque = getBloqueEnSlot(eq.id, h);
                    const color = bloque ? getColorForEsp(bloque.especialidades?.id, especialidadesList) : null;
                    const esInicio = bloque && bloque.hora_inicio?.slice(0, 5) === h;

                    return (
                      <td
                        key={h}
                        style={{
                          padding: "6px 4px", borderBottom: "1px solid var(--border-sidebar)",
                          borderLeft: "1px solid var(--border-sidebar)",
                          position: "relative", verticalAlign: "middle",
                        }}
                      >
                        {bloque ? (
                          <div
                            title={`${bloque.especialidades?.nombre_oficial} — ${bloque.supervisor?.nombre_completo}\n${bloque.hora_inicio?.slice(0,5)}–${bloque.hora_fin?.slice(0,5)}\n${bloque.actividad_especifica || "Sin actividad definida"}`}
                            style={{
                              background: `${color}22`,
                              borderLeft: `3px solid ${color}`,
                              borderRadius: "4px",
                              padding: "4px 6px",
                              minHeight: "44px",
                              cursor: "pointer",
                              transition: "all 0.15s",
                              display: "flex", flexDirection: "column", justifyContent: "center",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${color}33`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${color}22`; }}
                            onClick={() => setModalBloque(bloque)}
                          >
                            {esInicio && (
                              <>
                                <div style={{ fontSize: "10px", fontWeight: 700, color }}>
                                  {bloque.especialidades?.nombre_oficial}
                                </div>
                                <div style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {bloque.supervisor?.nombre_completo?.split(" ")[0]}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              minHeight: "44px", borderRadius: "4px", cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.06)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            onClick={() => setModalBloque({ equipos: eq, hora_inicio: h, hora_fin: `${String(Number(h.split(":")[0]) + 1).padStart(2, "0")}:00` })}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== VISTA LISTA ===== */}
      {!loadingBloques && bloques.length > 0 && vistaModo === "lista" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bloques.map(b => {
            const color = getColorForEsp(b.especialidades?.id, especialidadesList);
            return (
              <div key={b.id} style={{
                background: "var(--bg-sidebar)", borderRadius: "12px",
                border: "1px solid var(--border-sidebar)",
                borderLeft: `4px solid ${color}`,
                padding: "16px 20px",
                display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
              }}>
                {/* Horario */}
                <div style={{
                  background: `${color}18`, border: `1px solid ${color}40`,
                  borderRadius: "8px", padding: "6px 12px", minWidth: "100px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600 }}>HORARIO</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color }}>
                    {b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}
                  </div>
                </div>

                {/* Equipo */}
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Equipo</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
                    {b.equipos?.codigo_interno}
                    {b.equipos?.plataforma_estado === "Cargada" && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#d97706" }}>⚠️ Cargada</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{b.equipos?.descripcion_equipo?.slice(0, 35)}</div>
                </div>

                {/* Especialidad */}
                <div style={{ minWidth: "120px" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Especialidad</div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    background: `${color}18`, border: `1px solid ${color}40`,
                    borderRadius: "6px", padding: "3px 8px", marginTop: "2px",
                    fontSize: "12px", fontWeight: 700, color,
                  }}>
                    {b.especialidades?.nombre_oficial}
                  </div>
                </div>

                {/* Supervisor */}
                <div style={{ minWidth: "140px" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supervisor</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", marginTop: "2px" }}>
                    {b.supervisor?.nombre_completo}
                  </div>
                </div>

                {/* Actividad */}
                <div style={{ flex: 2, minWidth: "180px" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Actividad</div>
                  <div style={{ fontSize: "13px", color: b.actividad_especifica ? "var(--color-text)" : "var(--color-text-muted)", fontStyle: b.actividad_especifica ? "normal" : "italic", marginTop: "2px" }}>
                    {b.actividad_especifica || "Sin definir — se completará por WhatsApp"}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setModalBloque(b)}
                    style={{
                      padding: "8px 12px", borderRadius: "7px", border: "1px solid var(--border-input)",
                      background: "transparent", color: "var(--color-text-muted)", cursor: "pointer",
                      fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px",
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(b.id)}
                    style={{
                      padding: "8px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "4px", fontSize: "12px",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== LEYENDA DE ESPECIALIDADES ===== */}
      {!loadingBloques && bloques.length > 0 && (
        <div style={{
          marginTop: "24px", padding: "16px 20px",
          background: "var(--bg-sidebar)", borderRadius: "12px", border: "1px solid var(--border-sidebar)",
          display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Especialidades:
          </span>
          {especialidadesList
            .filter(e => bloques.some(b => b.especialidades?.id === e.id))
            .map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "12px", height: "12px", borderRadius: "4px",
                  background: e.color || "#6b7280",
                  boxShadow: `0 0 0 2px ${(e.color || "#6b7280")}30`,
                }} />
                <span style={{ fontSize: "12px", color: "var(--color-text)", fontWeight: 600 }}>{e.nombre_oficial}</span>
              </div>
            ))}
        </div>
      )}

      {/* ===== MODAL CREACIÓN/EDICIÓN ===== */}
      {modalBloque !== null && (
        <BloqueModal
          bloque={modalBloque}
          equipos={equiposList}
          supervisores={supervisores}
          especialidades={especialidadesList}
          fechaPOD={fechaPOD}
          onClose={() => setModalBloque(null)}
          onSave={handleSaveBloque}
          saving={saving}
        />
      )}

      {/* ===== CONFIRM DELETE ===== */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-card, #fff)", borderRadius: "14px", padding: "28px",
            maxWidth: "380px", width: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            border: "1px solid var(--border-sidebar)", textAlign: "center",
          }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🗑️</div>
            <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px", color: "var(--color-text)" }}>
              ¿Eliminar este bloque?
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-input)",
                background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", fontWeight: 600, fontSize: "14px",
              }}>
                Cancelar
              </button>
              <button onClick={() => handleDeleteBloque(confirmDelete)} disabled={saving} style={{
                padding: "10px 20px", borderRadius: "8px", border: "none",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white", cursor: "pointer", fontWeight: 700, fontSize: "14px",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe spin */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
