import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw, Calendar, ChevronLeft, ChevronRight,
  Loader2, Send, Trash2, X, Users, Wifi, QrCode, Clock
} from "lucide-react";

// ================================================================
// CONSTANTES
// ================================================================
const HORA_INI = 7;  // 07:00
const HORA_FIN = 18; // 18:00
const HORAS_TOTAL = HORA_FIN - HORA_INI; // 11 horas
const SNAP_MIN = 30; // snap a 30 minutos

const COLOR_FALLBACK = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

// ================================================================
// HELPERS
// ================================================================
function horaStr(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minFromStr(str) {
  const [h, m] = (str || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function snapMin(min) {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

// Posición porcentual dentro del timeline (07:00–18:00)
function minToPct(min) {
  const clamp = Math.max(HORA_INI * 60, Math.min(HORA_FIN * 60, min));
  return ((clamp - HORA_INI * 60) / (HORAS_TOTAL * 60)) * 100;
}

function dateOffsetStr(base, offset) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
}

function formatFecha(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return `${dias[date.getDay()]} ${d} ${meses[Number(m) - 1]} ${y}`;
}

function getColor(especialidades, espId, idx = 0) {
  if (espId) {
    const esp = especialidades.find(e => e.id === espId);
    if (esp?.color) return esp.color;
  }
  return COLOR_FALLBACK[idx % COLOR_FALLBACK.length];
}

// ================================================================
// COMPONENTE: Barra horaria del timeline
// ================================================================
function TimelineRuler() {
  const hours = Array.from({ length: HORAS_TOTAL + 1 }, (_, i) => HORA_INI + i);
  return (
    <div style={{ position: "relative", height: "28px", background: "var(--bg-sidebar, #f8fafc)" }}>
      {hours.map(h => (
        <div
          key={h}
          style={{
            position: "absolute",
            left: `${((h - HORA_INI) / HORAS_TOTAL) * 100}%`,
            top: 0, bottom: 0,
            display: "flex", flexDirection: "column", alignItems: "center",
            transform: "translateX(-50%)",
          }}
        >
          <div style={{
            fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted, #64748b)",
            lineHeight: "28px", letterSpacing: "0.3px", userSelect: "none",
          }}>
            {String(h).padStart(2, "0")}:00
          </div>
        </div>
      ))}
    </div>
  );
}

// ================================================================
// COMPONENTE: Bloque en el timeline (draggable + resizable)
// ================================================================
function BloqueTimeline({ bloque, equipoRowRef, especialidades, onResize, onDelete }) {
  const iniMin = minFromStr(bloque.hora_inicio?.slice(0, 5));
  const finMin = minFromStr(bloque.hora_fin?.slice(0, 5));
  const left = minToPct(iniMin);
  const width = minToPct(finMin) - minToPct(iniMin);
  const color = getColor(especialidades, bloque.especialidades?.id);

  const resizingRef = useRef(null);

  const handleResizeStart = (e, side) => {
    e.stopPropagation();
    e.preventDefault();
    const rowRect = equipoRowRef.current?.getBoundingClientRect();
    if (!rowRect) return;
    resizingRef.current = { side, startX: e.clientX, iniMin, finMin, rowWidth: rowRect.width };

    const onMove = (mv) => {
      const { side, startX, iniMin, finMin, rowWidth } = resizingRef.current;
      const deltaPx = mv.clientX - startX;
      const deltaMin = (deltaPx / rowWidth) * HORAS_TOTAL * 60;

      let newIni = iniMin, newFin = finMin;
      if (side === "left") {
        newIni = snapMin(iniMin + deltaMin);
        newIni = Math.max(HORA_INI * 60, Math.min(newFin - 30, newIni));
      } else {
        newFin = snapMin(finMin + deltaMin);
        newFin = Math.min(HORA_FIN * 60, Math.max(newIni + 30, newFin));
      }
      onResize(bloque.id, { iniMin: newIni, finMin: newFin, preview: true });
    };

    const onUp = (mu) => {
      const { side, startX, iniMin, finMin, rowWidth } = resizingRef.current;
      const deltaPx = mu.clientX - startX;
      const deltaMin = (deltaPx / rowWidth) * HORAS_TOTAL * 60;

      let newIni = iniMin, newFin = finMin;
      if (side === "left") {
        newIni = snapMin(iniMin + deltaMin);
        newIni = Math.max(HORA_INI * 60, Math.min(newFin - 30, newIni));
      } else {
        newFin = snapMin(finMin + deltaMin);
        newFin = Math.min(HORA_FIN * 60, Math.max(newIni + 30, newFin));
      }
      onResize(bloque.id, { iniMin: newIni, finMin: newFin, preview: false });
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const durMin = finMin - iniMin;
  const showLabel = durMin >= 60;

  return (
    <div
      title={`${bloque.supervisor?.nombre_completo || ""} | ${bloque.especialidades?.nombre_oficial || ""} · ${bloque.hora_inicio?.slice(0,5)}–${bloque.hora_fin?.slice(0,5)}`}
      style={{
        position: "absolute",
        left: `${left}%`,
        width: `${width}%`,
        top: "4px", bottom: "4px",
        background: `${color}30`,
        border: `2px solid ${color}`,
        borderRadius: "6px",
        display: "flex", alignItems: "center",
        overflow: "hidden",
        userSelect: "none",
        zIndex: 2,
        transition: "box-shadow 0.15s",
        cursor: "default",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${color}50`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Handle Izquierdo */}
      <div
        onMouseDown={e => handleResizeStart(e, "left")}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "10px",
          cursor: "ew-resize", zIndex: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ width: "3px", height: "16px", borderRadius: "2px", background: `${color}80` }} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, padding: "0 12px", overflow: "hidden" }}>
        {showLabel && (
          <div style={{ fontSize: "11px", fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bloque.supervisor?.nombre_completo?.split(" ").slice(0, 2).join(" ")}
          </div>
        )}
        <div style={{ fontSize: "10px", color: `${color}bb`, whiteSpace: "nowrap" }}>
          {bloque.hora_inicio?.slice(0, 5)}–{bloque.hora_fin?.slice(0, 5)}
        </div>
      </div>

      {/* Botón eliminar */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(bloque.id); }}
        style={{
          background: "none", border: "none", color: `${color}80`, cursor: "pointer",
          padding: "2px 4px", display: "flex", alignItems: "center",
          fontSize: "12px", flexShrink: 0,
        }}
        title="Eliminar bloque"
      >
        <X size={12} />
      </button>

      {/* Handle Derecho */}
      <div
        onMouseDown={e => handleResizeStart(e, "right")}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "10px",
          cursor: "ew-resize", zIndex: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ width: "3px", height: "16px", borderRadius: "2px", background: `${color}80` }} />
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE: Tarjeta de Supervisor (arrastrable)
// ================================================================
function SupervisorCard({ participante, isDragging, onDragStart }) {
  const esp = participante.personal?.especialidades;
  const nombre = participante.personal?.nombre_completo || "?";
  const color = esp?.color || "#10b981";
  const initials = nombre.split(" ").map(n => n[0]).slice(0, 2).join("");

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, participante)}
      style={{
        background: `${color}12`,
        border: `1.5px solid ${color}50`,
        borderRadius: "12px",
        padding: "12px 14px",
        cursor: "grab",
        userSelect: "none",
        display: "flex", alignItems: "center", gap: "10px",
        transition: "all 0.15s",
        opacity: isDragging ? 0.5 : 1,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(2px)"; e.currentTarget.style.boxShadow = `0 4px 16px ${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: `${color}25`, border: `2px solid ${color}60`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 800, color, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {nombre.split(" ").slice(0, 2).join(" ")}
        </div>
        {esp && (
          <div style={{ fontSize: "11px", color, fontWeight: 600, marginTop: "1px" }}>
            {esp.nombre_oficial}
          </div>
        )}
      </div>
      <div style={{
        width: "8px", height: "8px", borderRadius: "50%",
        background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)", flexShrink: 0,
      }} title="Conectado" />
    </div>
  );
}

// ================================================================
// COMPONENTE: Fila de Equipo en el Timeline
// ================================================================
function EquipoRow({ equipo, bloques, participantes, especialidades, draggingSup, onDrop, onResize, onDelete }) {
  const rowRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const bloquesEquipo = bloques.filter(b => b.equipos?.id === equipo.id);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!draggingSup) return;
    const rowRect = rowRef.current?.getBoundingClientRect();
    if (!rowRect) return;
    const pct = (e.clientX - rowRect.left) / rowRect.width;
    const totalMin = HORA_INI * 60 + pct * HORAS_TOTAL * 60;
    const snapIni = snapMin(Math.max(HORA_INI * 60, Math.min(HORA_FIN * 60 - 60, totalMin - 30)));
    const snapFin = Math.min(HORA_FIN * 60, snapIni + 60);
    onDrop(equipo, draggingSup, snapIni, snapFin);
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--border-container, #e2e8f0)", minHeight: "54px" }}>
      {/* Label equipo */}
      <div style={{
        width: "130px", flexShrink: 0, padding: "8px 12px",
        background: "var(--bg-sidebar, #f8fafc)",
        borderRight: "1px solid var(--border-container, #e2e8f0)",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
          {equipo.codigo_interno}
        </div>
        <div style={{ fontSize: "10px", color: "var(--color-text-muted, #64748b)", marginTop: "1px", lineHeight: 1.2 }}>
          {equipo.descripcion_equipo?.slice(0, 24)}{equipo.descripcion_equipo?.length > 24 ? "…" : ""}
        </div>
      </div>

      {/* Timeline drop zone */}
      <div
        ref={rowRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1, position: "relative",
          background: dragOver ? "rgba(16,185,129,0.06)" : "transparent",
          borderLeft: dragOver ? "2px solid #10b981" : "2px solid transparent",
          transition: "all 0.15s",
          minHeight: "54px",
        }}
      >
        {/* Grid de horas (líneas verticales) */}
        {Array.from({ length: HORAS_TOTAL + 1 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i / HORAS_TOTAL) * 100}%`,
              top: 0, bottom: 0,
              width: "1px",
              background: i === 0 || i === HORAS_TOTAL ? "transparent" : "rgba(0,0,0,0.06)",
            }}
          />
        ))}

        {/* Drop hint */}
        {dragOver && bloquesEquipo.length === 0 && (
          <div style={{
            position: "absolute", inset: "6px", borderRadius: "6px",
            border: "2px dashed #10b981", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#10b981", fontSize: "12px", fontWeight: 700,
            pointerEvents: "none", zIndex: 1,
          }}>
            Suelta aquí para asignar
          </div>
        )}

        {/* Bloques */}
        {bloquesEquipo.map(b => (
          <BloqueTimeline
            key={b.id}
            bloque={b}
            equipoRowRef={rowRef}
            especialidades={especialidades}
            onResize={onResize}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ================================================================
// MODAL: Confirmar asignación al hacer drop
// ================================================================
function ModalAsignacion({ data, especialidades, onConfirm, onClose, saving }) {
  const [form, setForm] = useState({
    hora_inicio: horaStr(data.iniMin),
    hora_fin: horaStr(data.finMin),
    especialidad_id: data.supervisor?.personal?.especialidad_id || "",
    actividad_especifica: "",
  });

  const horasOpciones = Array.from({ length: (HORA_FIN - HORA_INI) * 2 + 1 }, (_, i) => {
    const min = HORA_INI * 60 + i * 30;
    return horaStr(min);
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-card, #fff)", borderRadius: "16px", padding: "28px",
        width: "min(480px, 94vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>
            Asignar bloque
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "18px", padding: "12px", background: "rgba(16,185,129,0.06)", borderRadius: "10px" }}>
          <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text)" }}>{data.supervisor?.personal?.nombre_completo}</strong>
            {" → "}
            <strong style={{ color: "var(--color-text)" }}>{data.equipo?.codigo_interno}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Hora inicio</label>
            <select
              value={form.hora_inicio}
              onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
              style={{ width: "100%", background: "var(--bg-input,#f8fafc)", border: "1px solid var(--border-input,#e2e8f0)", borderRadius: "8px", padding: "9px 10px", fontSize: "13px", cursor: "pointer" }}
            >
              {horasOpciones.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Hora fin</label>
            <select
              value={form.hora_fin}
              onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}
              style={{ width: "100%", background: "var(--bg-input,#f8fafc)", border: "1px solid var(--border-input,#e2e8f0)", borderRadius: "8px", padding: "9px 10px", fontSize: "13px", cursor: "pointer" }}
            >
              {horasOpciones.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Especialidad</label>
          <select
            value={form.especialidad_id}
            onChange={e => setForm(f => ({ ...f, especialidad_id: e.target.value }))}
            style={{ width: "100%", background: "var(--bg-input,#f8fafc)", border: "1px solid var(--border-input,#e2e8f0)", borderRadius: "8px", padding: "9px 10px", fontSize: "13px", cursor: "pointer" }}
          >
            <option value="">Sin especialidad</option>
            {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre_oficial}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Actividad (opcional)</label>
          <input
            type="text" value={form.actividad_especifica}
            onChange={e => setForm(f => ({ ...f, actividad_especifica: e.target.value }))}
            placeholder="Ej: Instalación vigas eje 5"
            style={{ width: "100%", background: "var(--bg-input,#f8fafc)", border: "1px solid var(--border-input,#e2e8f0)", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid var(--border-input,#e2e8f0)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ ...form, equipo_id: data.equipo.id, supervisor_id: data.supervisor.personal.id, fecha: data.fecha })}
            disabled={saving || !form.especialidad_id}
            style={{
              padding: "9px 22px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white", cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px", fontWeight: 700, opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: "8px",
            }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
            Crear bloque
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL: PlanificacionPodTab
// ================================================================
export default function PlanificacionPodTab({ hookProps, currentUser }) {
  const { equiposCompleto, personalCompleto, especialidades, showMsg, saving, setSaving, botPhone } = hookProps;

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const manana = dateOffsetStr(hoy, 1);

  const [fechaPOD, setFechaPOD] = useState(manana);
  const [bloques, setBloques] = useState([]);
  const [loadingBloques, setLoadingBloques] = useState(false);
  const [participantes, setParticipantes] = useState([]);
  const [draggingSup, setDraggingSup] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null); // para modal de confirmación
  const [enviandoPOD, setEnviandoPOD] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const pollRef = useRef(null);

  // ── Contexto del proyecto ──
  const proyectoActivoId = currentUser?.proyecto_actual_id || null;
  const proyectoActivoInfo = currentUser?.proyecto || null;

  // ── Datos filtrados ──
  const todosLosEquipos = equiposCompleto.data || [];
  const equiposList = proyectoActivoId
    ? todosLosEquipos.filter(eq => eq.proyecto_actual_id === proyectoActivoId)
    : todosLosEquipos;

  const especialidadesList = especialidades.data || [];

  // ── URL del QR → wa.me directo al bot ──
  // El supervisor escanea, WhatsApp se abre con el texto PRE-CARGADO
  const botPhoneClean = (botPhone || "").replace(/[^0-9]/g, "");
  const qrUrl = botPhoneClean
    ? `https://wa.me/${botPhoneClean}?text=PARTICIPAR_POD`
    : "";
  const qrImgSrc = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&bgcolor=0f1f2e&color=10b981&margin=10`
    : null;

  // ── Cargar bloques ──
  const cargarBloques = useCallback(async () => {
    setLoadingBloques(true);
    try {
      const params = new URLSearchParams({ fecha: fechaPOD });
      if (proyectoActivoId) params.set("proyecto_id", proyectoActivoId);
      const r = await fetch(`/api/pod/bloques?${params}`);
      const json = await r.json();
      if (json.success) setBloques(json.data || []);
    } catch (e) { console.error(e); }
    setLoadingBloques(false);
  }, [fechaPOD, proyectoActivoId]);

  // ── Cargar participantes (polling) ──
  const cargarParticipantes = useCallback(async (silent = false) => {
    if (!proyectoActivoId) return;
    try {
      const r = await fetch(`/api/pod/sesion?fecha=${fechaPOD}&proyecto_id=${proyectoActivoId}`);
      const json = await r.json();
      if (json.success) setParticipantes(json.data || []);
    } catch {}
  }, [fechaPOD, proyectoActivoId]);

  useEffect(() => { cargarBloques(); }, [cargarBloques]);
  useEffect(() => { cargarParticipantes(); }, [cargarParticipantes]);

  // Polling de participantes cada 4s
  useEffect(() => {
    pollRef.current = setInterval(() => cargarParticipantes(true), 4000);
    return () => clearInterval(pollRef.current);
  }, [cargarParticipantes]);

  // ── Supervisores del proyecto aún NO conectados ──
  const todoElPersonal = personalCompleto.data || [];
  const supervisoresProyecto = todoElPersonal.filter(p =>
    (p.rol === "Supervisor" || p.rol === "Jefe de Area") &&
    (!proyectoActivoId || p.proyecto_actual_id === proyectoActivoId)
  );
  const idsConectados = new Set(participantes.map(pa => pa.personal?.id));
  const supervisoresPendientes = supervisoresProyecto.filter(s => !idsConectados.has(s.id));

  // ── Preview local de resize ──
  const handleResize = useCallback((bloqueId, { iniMin, finMin, preview }) => {
    setBloques(prev => prev.map(b => b.id !== bloqueId ? b : {
      ...b,
      hora_inicio: horaStr(iniMin) + ":00",
      hora_fin: horaStr(finMin) + ":00",
    }));
    if (!preview) {
      fetch("/api/pod/bloques", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bloqueId,
          hora_inicio: horaStr(iniMin) + ":00",
          hora_fin: horaStr(finMin) + ":00",
        }),
      }).then(() => cargarBloques());
    }
  }, [cargarBloques]);

  // ── Eliminar bloque ──
  const handleDeleteBloque = async (id) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/pod/bloques?id=${id}`, { method: "DELETE" });
      const json = await r.json();
      if (json.success) { showMsg("✅ Bloque eliminado"); cargarBloques(); }
      else showMsg(`❌ ${json.error}`, false);
    } catch (e) { showMsg(`❌ ${e.message}`, false); }
    setSaving(false);
  };

  // ── Drop de supervisor sobre equipo ──
  const handleDrop = (equipo, supervisor, iniMin, finMin) => {
    setPendingDrop({ equipo, supervisor, iniMin, finMin, fecha: fechaPOD });
  };

  // ── Confirmar asignación desde modal ──
  const handleConfirmDrop = async (formData) => {
    setSaving(true);
    try {
      const r = await fetch("/api/pod/bloques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Bloque creado");
        setPendingDrop(null);
        cargarBloques();
      } else {
        showMsg(`❌ ${json.error}`, false);
      }
    } catch (e) { showMsg(`❌ ${e.message}`, false); }
    setSaving(false);
  };

  // ── Inicializar POD ──
  const handleInicializarPOD = async () => {
    if (!window.confirm(`¿Inicializar el POD para el ${formatFecha(fechaPOD)}?\n\nSe enviará "PARTICIPAR_POD" a los supervisores con bloques asignados.`)) return;
    setEnviandoPOD(true);
    try {
      const r = await fetch("/api/pod/finalizar", { method: "POST", headers: { "Content-Type": "application/json" } });
      const json = await r.json();
      if (json.success) showMsg(`✅ POD inicializado — ${json.alertas_enviadas || 0} alertas`);
      else showMsg(`❌ ${json.message || json.error}`, false);
    } catch (e) { showMsg(`❌ ${e.message}`, false); }
    setEnviandoPOD(false);
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div style={{ padding: "20px 24px", maxWidth: "1600px", fontFamily: "'Inter', sans-serif" }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            📋 Sala POD
          </h1>
          {proyectoActivoInfo && (
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
              <span style={{ color: "#10b981", fontWeight: 700 }}>{proyectoActivoInfo.codigo_cc}</span>
              {" · "}{proyectoActivoInfo.nombre_proyecto}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Navegación de fecha */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)", borderRadius: "10px", padding: "5px 10px" }}>
            <button onClick={() => setFechaPOD(dateOffsetStr(fechaPOD, -1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}>
              <ChevronLeft size={15} />
            </button>
            <Calendar size={13} style={{ color: "#10b981" }} />
            <input
              type="date" value={fechaPOD}
              onChange={e => setFechaPOD(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", fontSize: "13px", fontWeight: 700, color: "var(--color-text)", cursor: "pointer", fontFamily: "inherit" }}
            />
            <button onClick={() => setFechaPOD(dateOffsetStr(fechaPOD, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}>
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            onClick={cargarBloques}
            style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
            title="Recargar"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={handleInicializarPOD}
            disabled={enviandoPOD}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)", border: "none",
              borderRadius: "8px", padding: "7px 14px", cursor: "pointer",
              color: "white", fontSize: "12px", fontWeight: 700,
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {enviandoPOD ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
            {enviandoPOD ? "Enviando..." : "📲 Inicializar POD y enviar WA"}
          </button>
        </div>
      </div>

      {/* ── BODY: SPLIT PANEL ── */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* ═══════════ PANEL IZQUIERDO: Supervisores ═══════════ */}
        <div style={{
          width: "260px", flexShrink: 0,
          background: "var(--bg-container, #fff)",
          border: "1px solid var(--border-container, #e2e8f0)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}>
          {/* Header panel */}
          <div style={{
            padding: "14px 16px",
            background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))",
            borderBottom: "1px solid var(--border-container, #e2e8f0)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={15} color="#10b981" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>Supervisores</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>EN VIVO</span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              {participantes.length} conectado{participantes.length !== 1 ? "s" : ""} · Arrastra sobre un equipo
            </div>
          </div>

          {/* Supervisores conectados */}
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {participantes.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "12px" }}>
                Esperando supervisores…<br />
                <span style={{ fontSize: "11px", opacity: 0.7 }}>Comparte el QR para que se unan</span>
              </div>
            )}
            {participantes.map(p => (
              <SupervisorCard
                key={p.id}
                participante={p}
                isDragging={draggingSup?.id === p.id}
                onDragStart={(e, part) => {
                  setDraggingSup(part);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              />
            ))}

            {/* Separador: pendientes */}
            {supervisoresPendientes.length > 0 && (
              <div style={{ margin: "4px 0" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-container,#e2e8f0)" }} />
                  Pendiente
                  <div style={{ flex: 1, height: "1px", background: "var(--border-container,#e2e8f0)" }} />
                </div>
                {supervisoresPendientes.map(s => {
                  const color = s.especialidades?.color || "#6b7280";
                  return (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 12px", borderRadius: "10px",
                      background: "rgba(107,114,128,0.06)", border: "1px dashed rgba(107,114,128,0.2)",
                      marginBottom: "6px", opacity: 0.7,
                    }}>
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%",
                        background: "rgba(107,114,128,0.1)", border: "1px dashed rgba(107,114,128,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700, color: "#6b7280", flexShrink: 0,
                      }}>
                        {s.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.nombre_completo.split(" ").slice(0, 2).join(" ")}
                        </div>
                        {s.especialidades && (
                          <div style={{ fontSize: "10px", color, fontWeight: 600 }}>{s.especialidades.nombre_oficial}</div>
                        )}
                      </div>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6b7280", flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QR */}
          {proyectoActivoId && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-container, #e2e8f0)" }}>
              <button
                onClick={() => setShowQR(!showQR)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "8px",
                  background: showQR ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px",
                  padding: "10px 14px", cursor: "pointer", color: "#10b981",
                  fontSize: "12px", fontWeight: 700, transition: "all 0.15s",
                }}
              >
                <QrCode size={14} />
                {showQR ? "Ocultar QR" : "📱 QR WhatsApp para supervisores"}
              </button>
              {showQR && (
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  {qrImgSrc ? (
                    <div style={{
                      display: "inline-block", padding: "10px",
                      background: "#0f1f2e", borderRadius: "12px",
                      border: "2px solid rgba(16,185,129,0.3)",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImgSrc} alt="QR WA POD" style={{ width: "170px", height: "170px", display: "block", borderRadius: "6px" }} />
                    </div>
                  ) : (
                    <div style={{ padding: "20px", color: "#64748b", fontSize: "12px" }}>
                      ⚠️ Configura el número del bot en Puente WhatsApp
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                    El supervisor escanea con su célular
                    <br />WhatsApp se abre con <strong>PARTICIPAR_POD</strong> listo para enviar
                    <br />El bot confirma y lo registra en la sala ✅
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════ PANEL DERECHO: Timeline ═══════════ */}
        <div style={{
          flex: 1, minWidth: 0,
          background: "var(--bg-container, #fff)",
          border: "1px solid var(--border-container, #e2e8f0)",
          borderRadius: "14px", overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
          onDragEnd={() => setDraggingSup(null)}
        >
          {/* Header timeline */}
          <div style={{
            padding: "12px 16px",
            background: "var(--bg-sidebar, #f8fafc)",
            borderBottom: "1px solid var(--border-container, #e2e8f0)",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <Clock size={14} color="#64748b" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>
              {formatFecha(fechaPOD)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              — {equiposList.length} equipo{equiposList.length !== 1 ? "s" : ""}
            </span>
            {loadingBloques && <Loader2 size={13} color="#10b981" style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
          </div>

          {/* Regla horaria */}
          <div style={{ display: "flex" }}>
            <div style={{ width: "130px", flexShrink: 0, background: "var(--bg-sidebar,#f8fafc)", borderRight: "1px solid var(--border-container,#e2e8f0)", borderBottom: "1px solid var(--border-container,#e2e8f0)" }} />
            <div style={{ flex: 1, borderBottom: "1px solid var(--border-container,#e2e8f0)" }}>
              <TimelineRuler />
            </div>
          </div>

          {/* Filas de equipos */}
          {equiposList.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "14px" }}>
              {proyectoActivoId
                ? "No hay equipos asignados a este proyecto."
                : "Selecciona tu identidad para ver los equipos del proyecto."
              }
            </div>
          ) : (
            equiposList.map(eq => (
              <EquipoRow
                key={eq.id}
                equipo={eq}
                bloques={bloques}
                participantes={participantes}
                especialidades={especialidadesList}
                draggingSup={draggingSup}
                onDrop={handleDrop}
                onResize={handleResize}
                onDelete={handleDeleteBloque}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal de confirmación de asignación */}
      {pendingDrop && (
        <ModalAsignacion
          data={pendingDrop}
          especialidades={especialidadesList}
          onConfirm={handleConfirmDrop}
          onClose={() => setPendingDrop(null)}
          saving={saving}
        />
      )}

      {/* Estilos globales */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
          50% { opacity: 0.6; box-shadow: 0 0 12px rgba(16,185,129,0.9); }
        }
      `}</style>
    </div>
  );
}
