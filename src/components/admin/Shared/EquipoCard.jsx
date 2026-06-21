import React from "react";
import { Pencil } from "lucide-react";
import PersonalAvatar from "./PersonalAvatar";
import { ESTADO_CONFIG } from "./constants";

export default function EquipoCard({ equipo, onPautaClick }) {
  const cfg = ESTADO_CONFIG[equipo.estado_actual] || ESTADO_CONFIG["Disponible"];
  const Icono = cfg.icon;

  const hasImage = equipo.imagen_url && equipo.imagen_url.trim() !== "";
  const cardBackground = hasImage
    ? `linear-gradient(rgba(18, 30, 54, 0.86), rgba(18, 30, 54, 0.96)), url(${equipo.imagen_url})`
    : "#121e36";

  return (
    <div
      className="equipo-card"
      style={{
        background: cardBackground,
        backgroundSize: hasImage ? "cover" : "auto",
        backgroundPosition: hasImage ? "center" : "auto",
        border: `2px solid ${cfg.border}`,
        borderRadius: "12px",
        padding: "18px",
        position: "relative",
        overflow: "visible", // Permitir que los tooltips floten sobre los bordes de la tarjeta
        transition: "all 0.3s ease",
      }}
    >
      {/* Barra de estado superior */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "4px",
          background: cfg.color,
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
            {equipo.codigo_interno}
          </div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "14px", marginTop: "2px", lineHeight: 1.3 }}>
            {equipo.descripcion_equipo}
          </div>
        </div>
        <div
          style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: "20px",
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Icono size={12} color={cfg.color} />
          <span style={{ color: cfg.color, fontSize: "11px", fontWeight: 700 }}>{cfg.label}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "12px" }}>
        {equipo.proveedor}
        {equipo.proyectos && (
          <span style={{ marginLeft: "8px", color: "#475569" }}>
            · 📍 {equipo.proyectos.nombre_proyecto}
          </span>
        )}
      </div>

      {/* Indicador Estilo Tablero Automotriz Digital */}
      {(() => {
        const esVehiculo = equipo.tipo_seguimiento === "vehiculo";
        const valorLectura = esVehiculo ? equipo.ultimo_odometro : equipo.ultimo_horometro;
        const colorGlow = esVehiculo ? "#38bdf8" : "#10b981"; // Azul Glaciar vs Verde Neon
        const label = esVehiculo ? "ODÓMETRO" : "HORÓMETRO";
        const unidad = esVehiculo ? "km" : "hrs";
        const formattedValue = valorLectura != null ? Number(valorLectura).toLocaleString("es-CL") : "------";

        return (
          <div
            style={{
              background: "#090f1d",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Pequeña barra brillante lateral */}
            <div
              style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: "3px",
                background: colorGlow,
                boxShadow: `0 0 8px ${colorGlow}`,
              }}
            />
            
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginLeft: "4px" }}>
              <span style={{ color: "#64748b", fontSize: "9px", fontWeight: 700, letterSpacing: "1px" }}>
                {label}
              </span>
              <span style={{ color: "#475569", fontSize: "9px", fontWeight: 500 }}>
                ÚLTIMO REGISTRO
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
                fontFamily: "monospace",
                background: "#050811",
                padding: "4px 10px",
                borderRadius: "4px",
                border: "1px solid #111e36",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: colorGlow,
                  letterSpacing: "1px",
                  textShadow: `0 0 6px ${colorGlow}`,
                }}
              >
                {formattedValue}
              </span>
              <span style={{ fontSize: "10px", color: "#475569", fontWeight: 700 }}>
                {unidad}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Indicador de Combustible */}
      {(() => {
        const nivel = equipo.reporte_hoy?.combustible_nivel_porcentaje;
        if (nivel === undefined || nivel === null) return null;

        const esCritico = nivel <= 25;
        const colorCombustible = nivel >= 50 
          ? "#22c55e" 
          : nivel > 25 
            ? "#eab308" 
            : "#ef4444";

        return (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>NIVEL ESTANQUE</span>
              <span style={{ color: esCritico ? "#f87171" : "white", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                {esCritico && <span className="animate-pulse-fuel" style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />}
                {nivel}%
              </span>
            </div>
            <div style={{ width: "100%", height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden", border: "1px solid #1c2e52" }}>
              <div
                className={esCritico ? "animate-pulse-fuel" : ""}
                style={{
                  width: `${nivel}%`,
                  height: "100%",
                  background: colorCombustible,
                  boxShadow: esCritico ? `0 0 8px ${colorCombustible}` : "none",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Pauta activa */}
      {equipo.pauta_preventiva_activa && (
        <div
          style={{
            background: "#0f172a",
            borderLeft: "3px solid #ff303e",
            borderRadius: "6px",
            padding: "8px 10px",
            marginBottom: "10px",
          }}
        >
          <div style={{ color: "#ff303e", fontSize: "10px", fontWeight: 700, marginBottom: "2px" }}>
            📋 PAUTA HOY
          </div>
          <div style={{ color: "#cbd5e1", fontSize: "11px", lineHeight: 1.4 }}>
            {equipo.pauta_preventiva_activa.slice(0, 80)}{equipo.pauta_preventiva_activa.length > 80 ? "…" : ""}
          </div>
        </div>
      )}

      {/* Personal asociado */}
      {equipo.reporte_hoy && (
        <div style={{
          marginTop: "4px",
          marginBottom: "12px",
          padding: "8px 10px",
          background: "rgba(15, 23, 42, 0.4)",
          borderRadius: "8px",
          border: "1px solid rgba(28, 46, 82, 0.4)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          <div style={{ color: "#64748b", fontSize: "9px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
            Personal Asignado
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", minHeight: "32px" }}>
            {equipo.tipo_seguimiento === "vehiculo" ? (
              equipo.reporte_hoy.supervisor ? (
                <PersonalAvatar
                  persona={equipo.reporte_hoy.supervisor}
                  rolEtiqueta="Supervisor"
                  cfgBorder={cfg.border}
                />
              ) : (
                <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>Sin supervisor asignado</span>
              )
            ) : (
              <>
                {equipo.reporte_hoy.operador ? (
                  <PersonalAvatar
                    persona={equipo.reporte_hoy.operador}
                    rolEtiqueta="Operador"
                    cfgBorder={cfg.border}
                  />
                ) : (
                  <span style={{ color: "#475569", fontSize: "11px", fontStyle: "italic" }}>Sin operador</span>
                )}
                {equipo.reporte_hoy.rigger && (
                  <PersonalAvatar
                    persona={equipo.reporte_hoy.rigger}
                    rolEtiqueta="Rigger"
                    cfgBorder="#a855f7"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Botón editar pauta */}
      <button
        onClick={() => onPautaClick(equipo)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid #1c2e52",
          borderRadius: "6px",
          color: "#94a3b8",
          fontSize: "11px",
          padding: "5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = "#ff303e"; e.target.style.color = "#ff303e"; }}
        onMouseLeave={e => { e.target.style.borderColor = "#1c2e52"; e.target.style.color = "#94a3b8"; }}
      >
        <Pencil size={10} /> Editar pauta
      </button>
    </div>
  );
}
