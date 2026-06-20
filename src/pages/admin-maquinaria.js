import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  HardHat, Wrench, Building2, Users, LayoutGrid, FileText,
  Plus, RefreshCw, ChevronRight, AlertTriangle, Clock,
  CheckCircle, Coffee, XCircle, Pencil, Save, X, ThumbsUp, ThumbsDown, MessageSquare, MapPin, Map, QrCode, Search,
  Camera, Loader2
} from "lucide-react";

// ================================================================
// CONSTANTES DE ESTADO
// ================================================================
const ESTADO_CONFIG = {
  "Equipo Operativo": { color: "#16a34a", bg: "#dcfce7", border: "#86efac", icon: CheckCircle, label: "Operativo" },
  "Disponible":       { color: "#2563eb", bg: "#dbeafe", border: "#93c5fd", icon: Clock,       label: "Disponible" },
  "En Colacion":      { color: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: Coffee,      label: "Colación" },
  "Detenido por Falla": { color: "#c21a25", bg: "#fee2e2", border: "#fca5a5", icon: XCircle,   label: "Falla" },
};

// ================================================================
// HOOKS
// ================================================================
function useApi(endpoint, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(endpoint);
      const json = await r.json();
      setData(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch_(false); }, deps);
  return { data, loading, refresh: (silent = false) => fetch_(silent) };
}

function usePaginatedApi(endpoint, initialLimit = 15, deps = []) {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", initialLimit.toString());
      if (search.trim() !== "") {
        url.searchParams.set("search", search.trim());
      }
      const r = await fetch(url.toString());
      const json = await r.json();
      setData(json.data || []);
      setCount(json.count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [endpoint, page, search, initialLimit]);

  useEffect(() => {
    fetch_(false);
  }, [page, search, ...deps]);

  // Resetear página a 1 cuando cambie la búsqueda
  useEffect(() => {
    setPage(1);
  }, [search]);

  return {
    data,
    count,
    loading,
    page,
    setPage,
    search,
    setSearch,
    refresh: (silent = false) => fetch_(silent),
    limit: initialLimit
  };
}

// ================================================================
// COMPONENTE: Avatar de Personal con Tooltip
// ================================================================
function PersonalAvatar({ persona, rolEtiqueta, cfgBorder }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  if (!persona) return null;

  const iniciales = persona.nombre_completo
    ? persona.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")
    : "??";

  // URL de WhatsApp directa
  const whatsappUrl = persona.whatsapp
    ? `https://wa.me/${persona.whatsapp.replace(/\+/g, "").replace(/\s/g, "")}`
    : null;

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => {
        setShowTooltip(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        setIsHovered(false);
      }}
    >
      {/* Círculo del avatar */}
      <div
        onClick={() => {
          if (whatsappUrl) window.open(whatsappUrl, "_blank");
        }}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          cursor: "pointer",
          border: `2px solid ${cfgBorder || "#2563eb"}`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15, 23, 42, 0.8)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
          transform: isHovered ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {persona.foto_url ? (
          <img
            src={persona.foto_url}
            alt={persona.nombre_completo}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#60a5fa" }}>
            {iniciales}
          </span>
        )}
      </div>

      {/* Tooltip emergente (popover premium) */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0b1329",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)",
            borderRadius: "8px",
            padding: "10px 12px",
            zIndex: 100,
            width: "180px",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            textAlign: "left"
          }}
        >
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {rolEtiqueta}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "white", lineHeight: "1.2" }}>
            {persona.nombre_completo}
          </div>
          {persona.whatsapp && (
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
              📱 {persona.whatsapp}
            </div>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                background: "#25d366",
                color: "white",
                textDecoration: "none",
                fontSize: "10px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "4px",
                textAlign: "center",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#1ebd54"}
              onMouseOut={(e) => e.currentTarget.style.background = "#25d366"}
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// TARJETA DE EQUIPO (Monitor)
// ================================================================
function EquipoCard({ equipo, onPautaClick }) {
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

// ================================================================
// MODAL DE PAUTA
// ================================================================
function PautaModal({ equipo, onClose, onSave }) {
  const [texto, setTexto] = useState(equipo?.pauta_preventiva_activa || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/equipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: equipo.id, pauta_preventiva_activa: texto }),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "500px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>Editar Pauta Preventiva</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
              {equipo?.codigo_interno} — {equipo?.descripcion_equipo}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ej: Revisar presión de neumáticos antes de iniciar. Cambio de filtro hidráulico programado para esta semana."
          style={{
            width: "100%", minHeight: "120px", background: "#0f172a",
            border: "1px solid #1c2e52", borderRadius: "8px",
            color: "white", padding: "12px", fontSize: "13px",
            resize: "vertical", outline: "none", fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
          Esta instrucción se inyectará en el WhatsApp del operador al escanear el QR mañana.
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #1c2e52",
            color: "#94a3b8", borderRadius: "8px", padding: "8px 16px",
            cursor: "pointer", fontSize: "13px",
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "#ff303e", border: "none",
            color: "white", borderRadius: "8px", padding: "8px 20px",
            cursor: "pointer", fontSize: "13px", fontWeight: 700,
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <Save size={14} /> {saving ? "Guardando…" : "Guardar Pauta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// FORMULARIO GENÉRICO
// ================================================================
function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", color: "#94a3b8", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #1c2e52",
  borderRadius: "8px", color: "white", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ================================================================
// MODAL DE QR DE EQUIPO
// ================================================================
function QrEquipoModal({ equipo, botPhone, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  if (!equipo) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  const landingLink = `${baseUrl}/qr/${equipo.codigo_interno}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(landingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${equipo.codigo_interno}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el QR:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Código QR - ${equipo.codigo_interno}</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              text-align: center;
              margin: 0;
            }
            .qr-container {
              border: 3px solid #000;
              padding: 40px;
              border-radius: 16px;
              background: #fff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            h1 { margin-bottom: 8px; font-size: 32px; font-weight: 800; letter-spacing: 0.5px; }
            h2 { margin-top: 0; color: #444; font-size: 20px; font-weight: 600; margin-bottom: 30px; max-width: 400px; line-height: 1.4; }
            .footer-text { margin-top: 30px; font-size: 14px; font-weight: bold; color: #ff303e; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${equipo.codigo_interno}</h1>
            <h2>${equipo.descripcion_equipo}</h2>
            <img src="${qrUrl}" width="300" height="300" />
            <div class="footer-text">Escanea para iniciar Reporte de Jornada en WhatsApp</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#ff303e", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Código QR de Equipo</div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px", marginTop: "2px" }}>{equipo.codigo_interno}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ color: "#cbd5e1", fontSize: "13px", marginBottom: "20px", textAlign: "left", lineHeight: 1.4 }}>
          {equipo.descripcion_equipo}
        </div>

        <div style={{
          background: "white", padding: "20px", borderRadius: "12px",
          display: "inline-block", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          <img src={qrUrl} alt={`QR ${equipo.codigo_interno}`} width={220} height={220} style={{ display: "block" }} />
        </div>

        <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "20px", lineHeight: 1.4 }}>
          Al escanear este QR con el móvil, el operador abrirá la landing page intermedia para registrar su ubicación y foto antes de ir a WhatsApp.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <button onClick={handlePrint} style={{
            background: "#ff303e", border: "none", color: "white",
            borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            transition: "background 0.2s"
          }}>
            Imprimir QR
          </button>
          <button onClick={handleDownload} disabled={downloading} style={{
            background: "#1e3a5f", border: "1px solid #2563eb", color: "#60a5fa",
            borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
          }}>
            {downloading ? "Descargando…" : "Descargar PNG"}
          </button>
        </div>
        <button onClick={handleCopy} style={{
          width: "100%", background: "transparent", border: "1px solid #1c2e52", color: copied ? "#10b981" : "#cbd5e1",
          borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
        }}>
          {copied ? "¡Enlace Copiado!" : "Copiar Enlace WhatsApp"}
        </button>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTES AUXILIARES: BUSCADOR, PAGINADOR Y RUT
// ================================================================
function formatRut(value) {
  let clean = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean;
  let dv = clean.slice(-1);
  let cuerpo = clean.slice(0, -1);
  let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
}
function Buscador({ value, onChange, placeholder }) {
  return (
    <div style={{
      position: "relative",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center"
    }}>
      <div style={{
        position: "absolute",
        left: "12px",
        color: "#64748b",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none"
      }}>
        <Search size={16} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          background: "#0f172a",
          border: "1px solid #1c2e52",
          borderRadius: "8px",
          color: "white",
          padding: "10px 12px 10px 38px",
          fontSize: "13px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
          transition: "all 0.2s",
        }}
        onFocus={e => {
          e.target.style.borderColor = "#ff303e";
          e.target.style.boxShadow = "0 0 0 2px rgba(255, 48, 62, 0.2)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "#1c2e52";
          e.target.style.boxShadow = "none";
        }}
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          style={{
            position: "absolute",
            right: "12px",
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 0
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function Paginador({ api, label }) {
  const totalPages = Math.ceil(api.count / api.limit);
  const fromRecord = api.count === 0 ? 0 : (api.page - 1) * api.limit + 1;
  const toRecord = Math.min(api.page * api.limit, api.count);

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px",
      background: "#121e36",
      borderTop: "1px solid #1c2e52",
      borderBottomLeftRadius: "12px",
      borderBottomRightRadius: "12px",
      fontSize: "13px",
      color: "#94a3b8"
    }}>
      <div>
        Mostrando <span style={{ color: "white", fontWeight: 600 }}>{fromRecord}-{toRecord}</span> de <span style={{ color: "white", fontWeight: 600 }}>{api.count}</span> {label}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => api.setPage(p => Math.max(p - 1, 1))}
            disabled={api.page === 1}
            style={{
              background: api.page === 1 ? "rgba(30, 58, 95, 0.4)" : "#1e3a5f",
              border: "1px solid #2563eb",
              color: api.page === 1 ? "#4b5563" : "#60a5fa",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: api.page === 1 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "12px",
              opacity: api.page === 1 ? 0.5 : 1,
              transition: "all 0.2s"
            }}
          >
            Anterior
          </button>
          <span style={{ color: "white", fontWeight: 600, padding: "0 8px" }}>
            Pág. {api.page} de {totalPages}
          </span>
          <button
            onClick={() => api.setPage(p => Math.min(p + 1, totalPages))}
            disabled={api.page >= totalPages}
            style={{
              background: api.page >= totalPages ? "rgba(30, 58, 95, 0.4)" : "#1e3a5f",
              border: "1px solid #2563eb",
              color: api.page >= totalPages ? "#4b5563" : "#60a5fa",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: api.page >= totalPages ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "12px",
              opacity: api.page >= totalPages ? 0.5 : 1,
              transition: "all 0.2s"
            }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

// ================================================================
// MODAL DE EDICIÓN COMPLETA DE EQUIPO
// ================================================================
function EditarEquipoModal({ equipo, proyectos, onClose, onSave }) {
  const [formData, setFormData] = useState({
    codigo_interno: equipo?.codigo_interno || "",
    descripcion_equipo: equipo?.descripcion_equipo || "",
    proveedor: equipo?.proveedor || "EIMISA",
    proyecto_actual_id: equipo?.proyecto_actual_id || "",
    estado_actual: equipo?.estado_actual || "Disponible",
    pauta_preventiva_activa: equipo?.pauta_preventiva_activa || "",
    patente: equipo?.patente || "",
    marca: equipo?.marca || "",
    modelo: equipo?.modelo || "",
    numero_serial: equipo?.numero_serial || "",
    tipo: equipo?.tipo || "",
    categoria: equipo?.categoria || "MAQUINARIA PESADA",
    anio_fabricacion: equipo?.anio_fabricacion !== null && equipo?.anio_fabricacion !== undefined ? equipo.anio_fabricacion.toString() : "",
    seguimiento_completo: equipo?.seguimiento_completo !== false,
    imagen_url: equipo?.imagen_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [subiendoFondo, setSubiendoFondo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleUploadFondo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFondo(true);
    setErrorMsg("");
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = event.target?.result;
      if (!base64String) {
        setSubiendoFondo(false);
        return;
      }

      try {
        const res = await fetch("/api/equipos/upload-imagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipoId: equipo.id,
            imageBase64: base64String
          })
        });

        const json = await res.json();
        if (json.success && json.imagen_url) {
          setFormData(prev => ({ ...prev, imagen_url: json.imagen_url }));
        } else {
          setErrorMsg("Error al subir imagen: " + (json.error || json.message));
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Ocurrió un error al subir la fotografía.");
      } finally {
        setSubiendoFondo(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.codigo_interno.trim() || !formData.descripcion_equipo.trim()) {
      setErrorMsg("Código Interno y Descripción son requeridos");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const body = {
        id: equipo.id,
        codigo_interno: formData.codigo_interno.trim(),
        descripcion_equipo: formData.descripcion_equipo.trim(),
        proveedor: formData.proveedor.trim(),
        proyecto_actual_id: formData.proyecto_actual_id === "" ? null : formData.proyecto_actual_id,
        estado_actual: formData.estado_actual,
        pauta_preventiva_activa: formData.pauta_preventiva_activa.trim() || null,
        patente: formData.patente.trim() || null,
        marca: formData.marca.trim() || null,
        modelo: formData.modelo.trim() || null,
        numero_serial: formData.numero_serial.trim() || null,
        tipo: formData.tipo.trim() || null,
        categoria: formData.categoria,
        anio_fabricacion: formData.anio_fabricacion.trim() !== "" ? parseInt(formData.anio_fabricacion) : null,
        seguimiento_completo: formData.seguimiento_completo,
        imagen_url: formData.imagen_url.trim() || null,
      };

      const r = await fetch("/api/equipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (json.success) {
        onSave();
      } else {
        setErrorMsg(json.error || json.message || "Error al guardar");
      }
    } catch (e) {
      setErrorMsg(e.message || "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const CATEGORIAS_MAESTRAS = ["GRÚAS", "CAMIONES", "MAQUINARIA PESADA", "MAQUINARIA SEMIPESADA", "VEHÍCULOS MENORES", "EQUIPOS MENORES"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "700px",
        maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Editar Maquinaria / Equipo</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
              Modifique los metadatos técnicos y operacionales del equipo.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#c21a25", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px", fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
          <FormRow label="Código Interno *">
            <input style={inputStyle} value={formData.codigo_interno}
              onChange={e => setFormData(p => ({ ...p, codigo_interno: e.target.value }))} />
          </FormRow>
          <FormRow label="Descripción *">
            <input style={inputStyle} value={formData.descripcion_equipo}
              onChange={e => setFormData(p => ({ ...p, descripcion_equipo: e.target.value }))} />
          </FormRow>
          <FormRow label="Patente">
            <input style={inputStyle} placeholder="Ej: AB-CD-12" value={formData.patente}
              onChange={e => setFormData(p => ({ ...p, patente: e.target.value }))} />
          </FormRow>
          <FormRow label="Marca">
            <input style={inputStyle} placeholder="Ej: Caterpillar" value={formData.marca}
              onChange={e => setFormData(p => ({ ...p, marca: e.target.value }))} />
          </FormRow>
          <FormRow label="Modelo">
            <input style={inputStyle} placeholder="Ej: 320D L" value={formData.modelo}
              onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} />
          </FormRow>
          <FormRow label="Número de Serie / Chasis">
            <input style={inputStyle} placeholder="Ej: CAT0320DL..." value={formData.numero_serial}
              onChange={e => setFormData(p => ({ ...p, numero_serial: e.target.value }))} />
          </FormRow>
          <FormRow label="Tipo de Equipo">
            <input style={inputStyle} placeholder="Ej: Excavadora Oruga" value={formData.tipo}
              onChange={e => setFormData(p => ({ ...p, tipo: e.target.value }))} />
          </FormRow>
          <FormRow label="Categoría Maestra">
            <select style={selectStyle} value={formData.categoria}
              onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS_MAESTRAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Año Fabricación">
            <input style={inputStyle} type="number" placeholder="Ej: 2018" value={formData.anio_fabricacion}
              onChange={e => setFormData(p => ({ ...p, anio_fabricacion: e.target.value }))} />
          </FormRow>
          <FormRow label="Proveedor">
            <input style={inputStyle} value={formData.proveedor}
              onChange={e => setFormData(p => ({ ...p, proveedor: e.target.value }))} />
          </FormRow>
          <FormRow label="Seguimiento de Horas por Especialidad/Operador">
            <select style={selectStyle} value={formData.seguimiento_completo.toString()}
              onChange={e => setFormData(p => ({ ...p, seguimiento_completo: e.target.value === "true" }))}>
              <option value="true">Sí (Flujo Completo con Operador, Horómetro y Especialidades)</option>
              <option value="false">No (Sin enlace a Operador, ej: Torres de Iluminación)</option>
            </select>
          </FormRow>
          <FormRow label="Proyecto / Obra Asociada">
            <select style={selectStyle} value={formData.proyecto_actual_id}
              onChange={e => setFormData(p => ({ ...p, proyecto_actual_id: e.target.value }))}>
              <option value="">Sin asignar / En Taller</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo_cc} — {p.nombre_proyecto}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Estado Operacional Actual">
            <select style={selectStyle} value={formData.estado_actual}
              onChange={e => setFormData(p => ({ ...p, estado_actual: e.target.value }))}>
              <option value="Equipo Operativo">Operativo</option>
              <option value="Disponible">Disponible (Sin operador)</option>
              <option value="En Colacion">En Colación</option>
              <option value="Detenido por Falla">Detenido por Falla (Taller)</option>
            </select>
          </FormRow>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <FormRow label="Pauta Preventiva Activa">
            <textarea
              value={formData.pauta_preventiva_activa}
              onChange={e => setFormData(p => ({ ...p, pauta_preventiva_activa: e.target.value }))}
              placeholder="Instrucciones especiales para el operador al iniciar jornada..."
              style={{
                width: "100%", minHeight: "80px", background: "#0f172a",
                border: "1px solid #1c2e52", borderRadius: "8px",
                color: "white", padding: "12px", fontSize: "13px",
                resize: "vertical", outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </FormRow>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <FormRow label="Fotografía de Fondo del Equipo">
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input
                  style={inputStyle}
                  placeholder="Pegue la URL de la imagen aquí o suba un archivo..."
                  value={formData.imagen_url}
                  onChange={e => setFormData(p => ({ ...p, imagen_url: e.target.value }))}
                />
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleUploadFondo}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoFondo}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background 0.2s"
                  }}
                >
                  {subiendoFondo ? (
                    <>
                      <Loader2 className="spinner animate-spin" size={14} />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={14} />
                      <span>Subir Imagen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {formData.imagen_url && (
              <div style={{ marginTop: "10px", position: "relative", width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", border: "1px solid #1c2e52" }}>
                <img
                  src={formData.imagen_url}
                  alt="Previsualización de fondo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, imagen_url: "" }))}
                  style={{
                    position: "absolute", top: "8px", right: "8px",
                    background: "rgba(239, 68, 68, 0.9)", border: "none",
                    borderRadius: "50%", width: "24px", height: "24px",
                    color: "white", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", fontSize: "12px",
                    fontWeight: 700
                  }}
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>
            )}
          </FormRow>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #1c2e52",
            color: "#94a3b8", borderRadius: "8px", padding: "10px 20px",
            cursor: "pointer", fontSize: "13px", fontWeight: 600,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)", border: "none",
            color: "white", borderRadius: "8px", padding: "10px 24px",
            cursor: "pointer", fontSize: "13px", fontWeight: 700,
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <Save size={14} /> {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PÁGINA PRINCIPAL
// ================================================================
export default function AdminMaquinaria() {
  const [tab, setTab] = useState("monitor");
  const [pautaEquipo, setPautaEquipo] = useState(null);
  const [editEquipo, setEditEquipo] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [searchMonitor, setSearchMonitor] = useState("");
  const [agruparPorProyecto, setAgruparPorProyecto] = useState(false);
  const pollRef = useRef(null);

  // Datos
  const equiposCompleto = useApi("/api/equipos", [tab]);
  const equiposPaginado = usePaginatedApi("/api/equipos", 15, [tab]);
  const proyectosCompleto = useApi("/api/proyectos", [tab]);
  const proyectosPaginado = usePaginatedApi("/api/proyectos", 15, [tab]);
  const personalCompleto = useApi("/api/personal", [tab]);
  const personalPaginado = usePaginatedApi("/api/personal", 15, [tab]);
  const reportes = useApi("/api/reportes", [tab]);
  const registros = useApi("/api/registros", [tab]);

  // Referencias para el mapa Leaflet
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  // Inicializar mapa de geolocalización cuando se cambia a la pestaña 'mapa'
  useEffect(() => {
    if (tab !== "mapa" || typeof window === "undefined" || equiposCompleto.loading) return;

    // Cargar CSS de Leaflet de forma dinámica
    if (!document.getElementById("leaflet-css")) {
      const linkEl = document.createElement("link");
      linkEl.id = "leaflet-css";
      linkEl.rel = "stylesheet";
      linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(linkEl);
    }

    let isMounted = true;

    const initMap = async () => {
      if (mapInstance.current) {
        renderMarkers();
        return;
      }

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Ubicación por defecto (Taller de Equipos Echeverria Izquierdo)
      const centerCoord = [-33.6129369, -70.7164499];

      const map = L.map(mapContainerRef.current, {
        center: centerCoord,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      markersLayer.current = L.layerGroup().addTo(map);
      mapInstance.current = map;

      renderMarkers();
    };

    const renderMarkers = async () => {
      if (!markersLayer.current) return;
      const L = (await import("leaflet")).default;
      markersLayer.current.clearLayers();

      const equiposConCoordenadas = equiposCompleto.data.filter(e => e.latitud_actual && e.longitud_actual);

      equiposConCoordenadas.forEach(e => {
        // Mapeo de colores de estado
        const estadoColores = {
          "Equipo Operativo": "#16a34a",
          "Disponible": "#2563eb",
          "En Colacion": "#d97706",
          "Detenido por Falla": "#c21a25",
        };
        const color = estadoColores[e.estado_actual] || "#2563eb";

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 32px; height: 32px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px ${color}88;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                color: white;
                font-size: 8px;
                font-weight: 800;
                font-family: sans-serif;
              ">${e.codigo_interno.slice(-4)}</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34]
        });

        const popupContent = `
          <div style="min-width: 180px; color: #f8fafc; font-family: sans-serif; padding: 2px;">
            <div style="font-size: 10px; font-weight: 700; color: #ff303e; text-transform: uppercase;">
              ${e.codigo_interno}
            </div>
            <div style="font-size: 13px; font-weight: 700; margin-top: 2px; margin-bottom: 6px; color: white;">
              ${e.descripcion_equipo}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Estado:</span>
              <span style="font-weight: 700; color: ${color};">${e.estado_actual}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Proyecto:</span>
              <span style="color: #cbd5e1; font-weight: 600;">${e.proyectos?.nombre_proyecto || "Sin proyecto"}</span>
            </div>
            ${e.ultima_ubicacion_fecha ? `
              <div style="border-top: 1px solid #1c2e52; margin-top: 6px; padding-top: 6px; font-size: 9px; color: #94a3b8;">
                📍 Act: ${new Date(e.ultima_ubicacion_fecha).toLocaleTimeString("es-CL")} - ${new Date(e.ultima_ubicacion_fecha).toLocaleDateString("es-CL")}
              </div>
            ` : ""}
          </div>
        `;

        L.marker([e.latitud_actual, e.longitud_actual], { icon })
          .addTo(markersLayer.current)
          .bindPopup(popupContent);
      });

      if (equiposConCoordenadas.length > 0 && mapInstance.current) {
        const bounds = L.latLngBounds(equiposConCoordenadas.map(e => [e.latitud_actual, e.longitud_actual]));
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersLayer.current = null;
      }
    };
  }, [tab, equiposCompleto.data, equiposCompleto.loading]);

  // Estados de edición para la pestaña de registros
  const [editRegistros, setEditRegistros] = useState({});
  const [rechazoId, setRechazoId] = useState(null);
  const [notaRechazo, setNotaRechazo] = useState("");

  // Inicializar estados de edición cuando se cargan registros
  useEffect(() => {
    if (registros.data && registros.data.length > 0) {
      const initial = {};
      registros.data.forEach(r => {
        initial[r.id] = {
          rut: "",
          nombre_completo: r.nombre_completo || "",
          rol_solicitado: r.rol_solicitado || "Operador"
        };
      });
      setEditRegistros(prev => ({ ...initial, ...prev }));
    }
  }, [registros.data]);

  // Auto-polling del monitor cada 10s
  useEffect(() => {
    if (tab !== "monitor") return;
    pollRef.current = setInterval(() => equiposCompleto.refresh(true), 10000);
    return () => clearInterval(pollRef.current);
  }, [tab]);

  // ---- Formularios ----
  const [formEquipo, setFormEquipo] = useState({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", proyecto_actual_id: "", seguimiento_completo: true });
  const [formProyecto, setFormProyecto] = useState({ nombre_proyecto: "", codigo_cc: "", ubicacion: "" });
  const [formPersonal, setFormPersonal] = useState({ rut: "", nombre_completo: "", whatsapp: "", rol: "Operador", turno_tipo: "14x14", jornada_tipo: "Dia", proyecto_actual_id: "", foto_url: "" });
  const [editingProyectoId, setEditingProyectoId] = useState(null);
  const [formEditProyecto, setFormEditProyecto] = useState({ nombre_proyecto: "", codigo_cc: "", ubicacion: "", activa: true });
  const [editingPersonalId, setEditingPersonalId] = useState(null);
  const [formEditPersonal, setFormEditPersonal] = useState({ nombre_completo: "", rut: "", whatsapp: "", rol: "Operador", proyecto_actual_id: "", turno_tipo: "14x14", jornada_tipo: "Dia", foto_url: "" });
  const [botPhone, setBotPhone] = useState("");
  const [qrEquipo, setQrEquipo] = useState(null);

  useEffect(() => {
    const loadBotPhone = async () => {
      try {
        const r = await fetch("/api/config");
        const json = await r.json();
        if (json.success && json.valor) {
          setBotPhone(json.valor);
        } else {
          setBotPhone("56911110001");
        }
      } catch (e) {
        console.error("Error al cargar configuración del bot:", e);
        setBotPhone("56911110001");
      }
    };
    loadBotPhone();
  }, []);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSubmit = async (endpoint, body, resetFn, refreshFn) => {
    setSaving(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Guardado con éxito");
        resetFn();
        refreshFn();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarProyecto = async () => {
    if (!formEditProyecto.nombre_proyecto || !formEditProyecto.codigo_cc) {
      showMsg("❌ Nombre del proyecto y Centro de Costos son obligatorios", false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/proyectos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingProyectoId, ...formEditProyecto }),
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Proyecto actualizado con éxito");
        setEditingProyectoId(null);
        proyectosPaginado.refresh();
        proyectosCompleto.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarPersonal = async () => {
    if (!formEditPersonal.nombre_completo || !formEditPersonal.rut || !formEditPersonal.whatsapp || !formEditPersonal.rol) {
      showMsg("❌ Nombre, RUT, WhatsApp y Rol son obligatorios", false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/personal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPersonalId, ...formEditPersonal }),
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Personal actualizado con éxito");
        setEditingPersonalId(null);
        personalPaginado.refresh();
        personalCompleto.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleAprobarRegistro = async (id) => {
    const editInfo = editRegistros[id];
    if (!editInfo?.rut || !editInfo.rut.trim()) {
      showMsg("❌ Debes ingresar un RUT válido", false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aprobar",
          id,
          rut: editInfo.rut,
          nombre_completo: editInfo.nombre_completo,
          rol_solicitado: editInfo.rol_solicitado,
          proyecto_actual_id: editInfo.proyecto_actual_id || null
        })
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Solicitud aprobada con éxito");
        registros.refresh();
        personalPaginado.refresh();
        personalCompleto.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleRechazarRegistro = async () => {
    if (!rechazoId) return;
    setSaving(true);
    try {
      const r = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rechazar",
          id: rechazoId,
          nota_rechazo: notaRechazo
        })
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Solicitud rechazada");
        setRechazoId(null);
        setNotaRechazo("");
        registros.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  // ================================================================
  // RENDER TABS
  // ================================================================
  const TABS = [
    { id: "monitor", label: "Consola", icon: LayoutGrid },
    { id: "mapa", label: "Mapa Faena", icon: MapPin },
    { id: "equipos", label: "Equipos", icon: HardHat },
    { id: "proyectos", label: "Proyectos", icon: Building2 },
    { id: "personal", label: "Personal", icon: Users },
    { id: "registros", label: "Registros", icon: Users },
    { id: "reportes", label: "Reportes", icon: FileText },
  ];

  const CATEGORIAS_MAESTRAS = ["TODAS", "GRÚAS", "CAMIONES", "MAQUINARIA PESADA", "MAQUINARIA SEMIPESADA", "VEHÍCULOS MENORES", "EQUIPOS MENORES"];

  // Filtrado de equipos por categoría, estado y buscador de monitoreo
  const equiposFiltrados = equiposCompleto.data.filter(eq => {
    const cumpleCat = filtroCategoria === "TODAS" || eq.categoria === filtroCategoria;
    const cumpleEst = filtroEstado === "TODOS" || eq.estado_actual === filtroEstado;
    
    const query = searchMonitor.trim().toLowerCase();
    const cumpleSearch = query === "" ||
      (eq.codigo_interno || "").toLowerCase().includes(query) ||
      (eq.descripcion_equipo || "").toLowerCase().includes(query) ||
      (eq.marca || "").toLowerCase().includes(query) ||
      (eq.modelo || "").toLowerCase().includes(query) ||
      (eq.patente || "").toLowerCase().includes(query) ||
      (eq.proveedor || "").toLowerCase().includes(query) ||
      (eq.proyectos?.nombre_proyecto || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.operador?.nombre_completo || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.supervisor?.nombre_completo || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.rigger?.nombre_completo || "").toLowerCase().includes(query);

    return cumpleCat && cumpleEst && cumpleSearch;
  });

  // Equipos filtrados por categoría y buscador para mostrar contadores coherentes
  const equiposPorCategoria = equiposCompleto.data.filter(eq => {
    const cumpleCat = filtroCategoria === "TODAS" || eq.categoria === filtroCategoria;
    
    const query = searchMonitor.trim().toLowerCase();
    const cumpleSearch = query === "" ||
      (eq.codigo_interno || "").toLowerCase().includes(query) ||
      (eq.descripcion_equipo || "").toLowerCase().includes(query) ||
      (eq.marca || "").toLowerCase().includes(query) ||
      (eq.modelo || "").toLowerCase().includes(query) ||
      (eq.patente || "").toLowerCase().includes(query) ||
      (eq.proveedor || "").toLowerCase().includes(query) ||
      (eq.proyectos?.nombre_proyecto || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.operador?.nombre_completo || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.supervisor?.nombre_completo || "").toLowerCase().includes(query) ||
      (eq.reporte_hoy?.rigger?.nombre_completo || "").toLowerCase().includes(query);

    return cumpleCat && cumpleSearch;
  });

  const statsCounts = {
    "Equipo Operativo": equiposPorCategoria.filter(e => e.estado_actual === "Equipo Operativo").length,
    "Disponible": equiposPorCategoria.filter(e => e.estado_actual === "Disponible").length,
    "En Colacion": equiposPorCategoria.filter(e => e.estado_actual === "En Colacion").length,
    "Detenido por Falla": equiposPorCategoria.filter(e => e.estado_actual === "Detenido por Falla").length,
  };

  // Agrupamiento por proyecto
  let gruposProyectos = {};
  if (agruparPorProyecto) {
    equiposFiltrados.forEach(eq => {
      const projId = eq.proyecto_actual_id || "sin_proyecto";
      const projNombre = eq.proyectos?.nombre_proyecto || "Equipos sin Proyecto";
      const projCC = eq.proyectos?.codigo_cc || "—";
      
      if (!gruposProyectos[projId]) {
        gruposProyectos[projId] = {
          id: projId,
          nombre: projNombre,
          cc: projCC,
          equipos: []
        };
      }
      gruposProyectos[projId].equipos.push(eq);
    });
  }

  return (
    <>
      <Head>
        <title>LukeEquipos — Control de Maquinaria</title>
        <meta name="description" content="Sistema de Control Operacional por Voz y Gestión de Maquinaria Pesada en Faena" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        backgroundImage: "linear-gradient(rgba(10, 17, 32, 0.88), rgba(10, 17, 32, 0.88)), url('https://www.arcus-global.com/wp/wp-content/uploads/2016/04/mquinaria-arcus-global_opt.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Inter', sans-serif",
        color: "white",
      }}>

        {/* ========== SIDEBAR ========== */}
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: "220px",
          background: "#101c33",
          borderRight: "1px solid #1a2c4d",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
        }}>
          {/* Logo */}
          <div style={{ padding: "24px 20px 16px" }}>
            <img
              src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
              alt="EIMISA Logo"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <div style={{ color: "#64748b", fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", paddingLeft: "2px", marginTop: "10px" }}>
              Control Maquinaria
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 12px" }}>
            {TABS.map(t => {
              const Icono = t.icon;
              const active = tab === t.id;
              const pendientesCount = t.id === "registros" ? registros.data.filter(r => r.estado === "pendiente" && r.nombre_completo).length : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "8px", border: "none",
                    background: active ? "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)" : "transparent",
                    color: active ? "white" : "#64748b",
                    cursor: "pointer", fontSize: "13px", fontWeight: active ? 700 : 500,
                    marginBottom: "4px", transition: "all 0.2s",
                    textAlign: "left",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#0a1120"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icono size={16} />
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {pendientesCount > 0 && (
                    <span style={{
                      background: "#ef4444", color: "white", borderRadius: "50%",
                      width: "18px", height: "18px", fontSize: "10px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 8px rgba(239, 68, 68, 0.4)"
                    }}>
                      {pendientesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Botón Vincular WhatsApp */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid #1c2e52" }}>
            <Link href="/qr-puente" style={{ textDecoration: "none" }}>
              <div
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 12px", borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  color: "#10b981",
                  cursor: "pointer", fontSize: "12px", fontWeight: 700,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)"; }}
              >
                <MessageSquare size={14} />
                <span>Puente WhatsApp</span>
              </div>
            </Link>
          </div>

          {/* Footer sidebar */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1c2e52" }}>
            <div style={{ color: "#1c2e52", fontSize: "10px" }}>equipos.lukeapp.me</div>
          </div>
        </div>

        {/* ========== CONTENIDO PRINCIPAL ========== */}
        <div style={{ marginLeft: "220px", padding: "28px 32px" }}>

          {/* Toast */}
          {msg && (
            <div style={{
              position: "fixed", top: "20px", right: "20px",
              background: msg.ok ? "#16a34a" : "#c21a25",
              color: "white", padding: "12px 20px", borderRadius: "8px",
              fontWeight: 600, fontSize: "13px", zIndex: 9999,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}>
              {msg.text}
            </div>
          )}

          {/* Pauta Modal */}
          {pautaEquipo && (
            <PautaModal
              equipo={pautaEquipo}
              onClose={() => setPautaEquipo(null)}
              onSave={() => { setPautaEquipo(null); equiposPaginado.refresh(true); equiposCompleto.refresh(true); }}
            />
          )}

          {/* Rechazo Modal */}
          {rechazoId && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000, padding: "20px",
            }}>
              <div style={{
                background: "#121e36", border: "1px solid #1c2e52",
                borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "450px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>Rechazar Solicitud de Registro</div>
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                      Ingresa el motivo del rechazo. Se enviará una notificación por WhatsApp al usuario.
                    </div>
                  </div>
                  <button onClick={() => setRechazoId(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <textarea
                  value={notaRechazo}
                  onChange={e => setNotaRechazo(e.target.value)}
                  placeholder="Ej: El número de WhatsApp no coincide con el personal contratado o el rol seleccionado no es correcto."
                  style={{
                    width: "100%", minHeight: "100px", background: "#0f172a",
                    border: "1px solid #1c2e52", borderRadius: "8px",
                    color: "white", padding: "12px", fontSize: "13px",
                    resize: "vertical", outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />

                <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
                  <button onClick={() => setRechazoId(null)} style={{
                    background: "transparent", border: "1px solid #1c2e52",
                    color: "#94a3b8", borderRadius: "8px", padding: "8px 16px",
                    cursor: "pointer", fontSize: "13px",
                  }}>
                    Cancelar
                  </button>
                  <button onClick={handleRechazarRegistro} disabled={saving} style={{
                    background: "#c21a25", border: "none",
                    color: "white", borderRadius: "8px", padding: "8px 20px",
                    cursor: "pointer", fontSize: "13px", fontWeight: 700,
                  }}>
                    {saving ? "Procesando…" : "Confirmar Rechazo"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Qr Equipo Modal */}
          {qrEquipo && (
            <QrEquipoModal
              equipo={qrEquipo}
              botPhone={botPhone}
              onClose={() => setQrEquipo(null)}
            />
          )}

          {/* ==================== MAPA ==================== */}
          {tab === "mapa" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Mapa de Geolocalización de Equipos</h1>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                    Ubicación en caliente basada en la última transmisión GPS compartida por el operador.
                  </p>
                </div>
                <button
                  onClick={() => equiposCompleto.refresh(true)}
                  style={{
                    background: "#121e36", border: "1px solid #1c2e52",
                    borderRadius: "8px", padding: "8px 14px", color: "#94a3b8",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
                  }}
                >
                  <RefreshCw size={13} /> Actualizar Posiciones
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "16px" }}>
                {/* Contenedor del mapa */}
                <div style={{ position: "relative", height: "calc(100vh - 200px)", borderRadius: "16px", overflow: "hidden", border: "1px solid #1c2e52" }}>
                  <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }}></div>
                </div>

                {/* Barra lateral con lista de equipos */}
                <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "16px", padding: "16px", overflowY: "auto", height: "calc(100vh - 200px)" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Equipos en Faena
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {equiposCompleto.data.map(e => {
                      const tieneGPS = e.latitud_actual && e.longitud_actual;
                      const cfg = ESTADO_CONFIG[e.estado_actual] || ESTADO_CONFIG["Disponible"];
                      return (
                        <div
                          key={e.id}
                          style={{
                            background: "#0f172a", borderRadius: "10px", padding: "12px",
                            border: `1px solid ${tieneGPS ? "rgba(99, 102, 241, 0.2)" : "#1c2e52"}`,
                            cursor: tieneGPS ? "pointer" : "default",
                            transition: "all 0.2s"
                          }}
                          onClick={() => {
                            if (tieneGPS && mapInstance.current) {
                              mapInstance.current.setView([e.latitud_actual, e.longitud_actual], 16);
                            }
                          }}
                          onMouseEnter={e => { if (tieneGPS) e.currentTarget.style.borderColor = "#6366f1"; }}
                          onMouseLeave={e => { if (tieneGPS) e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                            <span style={{ color: "#ff303e", fontWeight: 700, fontSize: "11px" }}>{e.codigo_interno}</span>
                            <span style={{
                              background: tieneGPS ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                              color: tieneGPS ? "#10b981" : "#94a3b8",
                              borderRadius: "10px", padding: "1px 6px", fontSize: "9px", fontWeight: 700
                            }}>
                              {tieneGPS ? "📡 GPS OK" : "🚫 SIN GPS"}
                            </span>
                          </div>
                          <div style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{e.descripcion_equipo}</div>
                          <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>Proyecto: {e.proyectos?.nombre_proyecto || "Sin proyecto"}</div>
                          
                          {tieneGPS && e.ultima_ubicacion_fecha && (
                            <div style={{ color: "#6366f1", fontSize: "10px", marginTop: "6px" }}>
                              Última act: {new Date(e.ultima_ubicacion_fecha).toLocaleTimeString("es-CL")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== MONITOR ==================== */}
          {tab === "monitor" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Consola de Monitoreo</h1>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                    {equiposFiltrados.length} equipos filtrados (de {equiposCompleto.data.length} totales) · Actualización automática cada 10s
                  </p>
                </div>
                <button
                  onClick={() => equiposCompleto.refresh(true)}
                  style={{
                    background: "#121e36", border: "1px solid #1c2e52",
                    borderRadius: "8px", padding: "8px 14px", color: "#94a3b8",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
                  }}
                >
                  <RefreshCw size={13} /> Actualizar
                </button>
              </div>

              {/* Panel de Controles de Filtros y Agrupamiento (Glassmorphism) */}
              <div
                style={{
                  background: "rgba(16, 28, 51, 0.6)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(28, 46, 82, 0.8)",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "24px",
                  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Buscador de Monitoreo */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Buscar Equipo
                  </div>
                  <div style={{ position: "relative", width: "100%" }}>
                    <Search
                      size={16}
                      color="#94a3b8"
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Ingrese código, descripción, patente, marca, modelo o proyecto del equipo..."
                      value={searchMonitor}
                      onChange={e => setSearchMonitor(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid #1c2e52",
                        borderRadius: "10px",
                        color: "white",
                        padding: "11px 16px 11px 40px",
                        fontSize: "13px",
                        outline: "none",
                        transition: "all 0.2s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={e => e.target.style.borderColor = "#ff303e"}
                      onBlur={e => e.target.style.borderColor = "#1c2e52"}
                    />
                    {searchMonitor && (
                      <button
                        type="button"
                        onClick={() => setSearchMonitor("")}
                        style={{
                          position: "absolute",
                          right: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: 700,
                          padding: "4px"
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Fila de Filtros de Categorías */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Filtrar por Categoría
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {CATEGORIAS_MAESTRAS.map(cat => {
                      const active = filtroCategoria === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFiltroCategoria(cat)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            border: active ? "1px solid #ff303e" : "1px solid #1c2e52",
                            background: active ? "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)" : "rgba(15, 23, 42, 0.4)",
                            color: active ? "white" : "#94a3b8",
                            fontSize: "12px",
                            fontWeight: active ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: active ? "0 4px 12px rgba(255, 48, 62, 0.25)" : "none",
                          }}
                          onMouseEnter={e => {
                            if (!active) {
                              e.currentTarget.style.borderColor = "#ff303e";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.background = "rgba(255, 48, 62, 0.05)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!active) {
                              e.currentTarget.style.borderColor = "#1c2e52";
                              e.currentTarget.style.color = "#94a3b8";
                              e.currentTarget.style.background = "rgba(15, 23, 42, 0.4)";
                            }
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fila de Filtros de Estado y Switch de Agrupamiento */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingTop: "12px", borderTop: "1px solid rgba(28, 46, 82, 0.5)" }}>
                  {/* Filtro de Estado */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Filtrar por Estado
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {["TODOS", ...Object.keys(ESTADO_CONFIG)].map(est => {
                        const active = filtroEstado === est;
                        const cfg = ESTADO_CONFIG[est];
                        const color = cfg ? cfg.color : "#64748b";
                        const activeBg = cfg ? cfg.bg : "rgba(100,116,139,0.15)";
                        
                        return (
                          <button
                            key={est}
                            onClick={() => setFiltroEstado(est)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: active ? `1.5px solid ${color}` : "1px solid #1c2e52",
                              background: active ? activeBg : "rgba(15, 23, 42, 0.4)",
                              color: active ? color : "#94a3b8",
                              fontSize: "12px",
                              fontWeight: active ? 700 : 500,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            onMouseEnter={e => {
                              if (!active) {
                                e.currentTarget.style.borderColor = color;
                                e.currentTarget.style.color = "white";
                              }
                            }}
                            onMouseLeave={e => {
                              if (!active) {
                                e.currentTarget.style.borderColor = "#1c2e52";
                                e.currentTarget.style.color = "#94a3b8";
                              }
                            }}
                          >
                            {cfg && <cfg.icon size={12} color={color} />}
                            {cfg ? cfg.label : "Todos"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggle Agrupamiento */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => setAgruparPorProyecto(!agruparPorProyecto)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: agruparPorProyecto ? "1px solid #ff303e" : "1px solid #1c2e52",
                        background: agruparPorProyecto ? "rgba(255, 48, 62, 0.1)" : "rgba(15, 23, 42, 0.4)",
                        color: agruparPorProyecto ? "#ff303e" : "#94a3b8",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                        boxShadow: agruparPorProyecto ? "0 4px 12px rgba(255, 48, 62, 0.1)" : "none",
                      }}
                      onMouseEnter={e => {
                        if (!agruparPorProyecto) {
                          e.currentTarget.style.borderColor = "#ff303e";
                          e.currentTarget.style.color = "#ff303e";
                          e.currentTarget.style.background = "rgba(255, 48, 62, 0.05)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!agruparPorProyecto) {
                          e.currentTarget.style.borderColor = "#1c2e52";
                          e.currentTarget.style.color = "#94a3b8";
                          e.currentTarget.style.background = "rgba(15, 23, 42, 0.4)";
                        }
                      }}
                    >
                      <Building2 size={15} />
                      <span>{agruparPorProyecto ? "Agrupado por Proyecto" : "Agrupar por Proyecto"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                {Object.entries(ESTADO_CONFIG).map(([estado, cfg]) => {
                  const Icono = cfg.icon;
                  return (
                    <div key={estado} style={{
                      background: "#121e36", border: `1px solid ${cfg.border}`,
                      borderRadius: "10px", padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icono size={16} color={cfg.color} />
                      </div>
                      <div>
                        <div style={{ color: "white", fontWeight: 800, fontSize: "20px" }}>
                          {statsCounts[estado]}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "11px" }}>{cfg.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid o Secciones de equipos */}
              {equiposCompleto.loading ? (
                <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>Cargando equipos…</div>
              ) : agruparPorProyecto ? (
                // Vista Agrupada por Proyecto
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {Object.values(gruposProyectos).map(grupo => (
                    <div
                      key={grupo.id}
                      style={{
                        background: "rgba(18, 30, 54, 0.3)",
                        border: "1px solid #1c2e52",
                        borderRadius: "14px",
                        padding: "20px",
                      }}
                    >
                      {/* Cabecera del Proyecto */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid rgba(28, 46, 82, 0.6)",
                          paddingBottom: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "rgba(255, 48, 62, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Building2 size={16} color="#ff303e" />
                          </div>
                          <div>
                            <div style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>
                              {grupo.nombre}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "11px", marginTop: "1px" }}>
                              CC: {grupo.cc}
                            </div>
                          </div>
                        </div>

                        {/* Badge de cantidad */}
                        <div
                          style={{
                            background: "rgba(255, 48, 62, 0.15)",
                            color: "#ff303e",
                            border: "1px solid rgba(255, 48, 62, 0.3)",
                            borderRadius: "20px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {grupo.equipos.length} {grupo.equipos.length === 1 ? "equipo" : "equipos"}
                        </div>
                      </div>

                      {/* Grid de equipos del Proyecto */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                        {grupo.equipos.map(eq => (
                          <EquipoCard key={eq.id} equipo={eq} onPautaClick={setPautaEquipo} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(gruposProyectos).length === 0 && (
                    <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>
                      No se encontraron equipos que cumplan con los filtros en ningún proyecto.
                    </div>
                  )}
                </div>
              ) : (
                // Vista Plana tradicional
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {equiposFiltrados.map(eq => (
                      <EquipoCard key={eq.id} equipo={eq} onPautaClick={setPautaEquipo} />
                    ))}
                  </div>
                  {equiposFiltrados.length === 0 && (
                    <div style={{ color: "#64748b", gridColumn: "1/-1", textAlign: "center", padding: "60px" }}>
                      No hay equipos que coincidan con los filtros seleccionados.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ==================== EQUIPOS ==================== */}
          {tab === "equipos" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Equipos</h1>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "#121e36", border: "1px solid #1c2e52",
                  padding: "6px 12px", borderRadius: "10px",
                }}>
                  <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>🤖 Teléfono del Bot:</span>
                  <input
                    style={{
                      background: "#0f172a", border: "1px solid #1c2e52",
                      borderRadius: "6px", color: "white", padding: "4px 8px",
                      fontSize: "12px", width: "120px", outline: "none",
                    }}
                    placeholder="569..."
                    value={botPhone}
                    onChange={e => setBotPhone(e.target.value)}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/config", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ valor: botPhone }),
                        });
                        const json = await r.json();
                        if (json.success) {
                          showMsg("✅ Teléfono del bot guardado en base de datos");
                        } else {
                          showMsg("❌ Error al guardar en base de datos", false);
                        }
                      } catch (e) {
                        showMsg("❌ Error al guardar en base de datos", false);
                      }
                    }}
                    style={{
                      background: "#ff303e", border: "none", color: "white",
                      borderRadius: "6px", padding: "4px 10px", fontSize: "12px",
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {/* Formulario nuevo equipo */}
              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>
                  + REGISTRAR NUEVO EQUIPO
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <FormRow label="Código Interno *">
                    <input style={inputStyle} placeholder="EIMI00387"
                      value={formEquipo.codigo_interno}
                      onChange={e => setFormEquipo(p => ({ ...p, codigo_interno: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Descripción *">
                    <input style={inputStyle} placeholder="Liebherr LR 1300"
                      value={formEquipo.descripcion_equipo}
                      onChange={e => setFormEquipo(p => ({ ...p, descripcion_equipo: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Proveedor">
                    <input style={inputStyle} placeholder="EIMISA"
                      value={formEquipo.proveedor}
                      onChange={e => setFormEquipo(p => ({ ...p, proveedor: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Proyecto Actual">
                    <select style={selectStyle}
                      value={formEquipo.proyecto_actual_id}
                      onChange={e => setFormEquipo(p => ({ ...p, proyecto_actual_id: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {proyectosCompleto.data.map(o => <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_proyecto}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Seguimiento de Horas por Especialidad/Operador">
                    <select style={selectStyle}
                      value={(formEquipo.seguimiento_completo !== false).toString()}
                      onChange={e => setFormEquipo(p => ({ ...p, seguimiento_completo: e.target.value === "true" }))}>
                      <option value="true">Sí (Flujo Completo con Operador, Horómetro y Especialidades)</option>
                      <option value="false">No (Sin enlace a Operador, ej: Torres de Iluminación)</option>
                    </select>
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/equipos", formEquipo, () => setFormEquipo({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", proyecto_actual_id: "", seguimiento_completo: true }), () => { equiposPaginado.refresh(); equiposCompleto.refresh(); })}
                  disabled={saving}
                  style={{
                    background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none",
                    color: "white", borderRadius: "8px", padding: "9px 20px",
                    cursor: "pointer", fontWeight: 700, fontSize: "13px",
                    display: "flex", alignItems: "center", gap: "6px", marginTop: "4px",
                  }}
                >
                  <Plus size={14} /> {saving ? "Guardando…" : "Registrar Equipo"}
                </button>
              </div>

              {/* Buscador de Equipos */}
              <Buscador
                value={equiposPaginado.search}
                onChange={e => equiposPaginado.setSearch(e.target.value)}
                placeholder="Buscar equipos por código, descripción, marca, modelo, patente, etc..."
              />

              {/* Tabla equipos */}
              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52" }}>
                      {["Código", "Descripción", "Proveedor", "Proyecto", "Estado", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {equiposPaginado.data.map((eq, i) => {
                      const cfg = ESTADO_CONFIG[eq.estado_actual] || ESTADO_CONFIG["Disponible"];
                      return (
                        <tr key={eq.id} style={{ borderBottom: i < equiposPaginado.data.length - 1 ? "1px solid #121e36" : "none", background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          <td style={{ padding: "12px 16px", color: "#ff303e", fontWeight: 700, fontSize: "13px" }}>{eq.codigo_interno}</td>
                          <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>{eq.descripcion_equipo}</td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.proveedor}</td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.proyectos?.nombre_proyecto || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => setEditEquipo(eq)}
                              style={{
                                background: "#1e3a5f", border: "1px solid #2563eb",
                                color: "#60a5fa", borderRadius: "6px", padding: "6px 12px",
                                fontSize: "11px", fontWeight: 700, cursor: "pointer",
                                display: "inline-flex", alignItems: "center", gap: "4px"
                              }}
                            >
                              <Pencil size={11} /> Editar
                            </button>
                            <button
                              onClick={() => setQrEquipo(eq)}
                              style={{
                                background: "#121e36", border: "1px solid #1c2e52",
                                color: "#94a3b8", borderRadius: "6px", padding: "6px 12px",
                                fontSize: "11px", fontWeight: 700, cursor: "pointer",
                                display: "inline-flex", alignItems: "center", gap: "4px"
                              }}
                            >
                              <QrCode size={11} /> QR
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {equiposPaginado.data.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                          No hay equipos registrados o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Paginador api={equiposPaginado} label="equipos" />
              </div>

              {editEquipo && (
                <EditarEquipoModal
                  equipo={editEquipo}
                  proyectos={proyectosCompleto.data}
                  onClose={() => setEditEquipo(null)}
                  onSave={() => {
                    setEditEquipo(null);
                    equiposPaginado.refresh();
                    equiposCompleto.refresh();
                    showMsg("✅ Equipo actualizado con éxito");
                  }}
                />
              )}
            </>
          )}

          {/* ==================== PROYECTOS ==================== */}
          {tab === "proyectos" && (
            <>
              <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Gestión de Proyectos</h1>

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>+ REGISTRAR NUEVO PROYECTO</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <FormRow label="Nombre Proyecto *">
                    <input style={inputStyle} placeholder="Andina Fase 2"
                      value={formProyecto.nombre_proyecto}
                      onChange={e => setFormProyecto(p => ({ ...p, nombre_proyecto: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Centro de Costos *">
                    <input style={inputStyle} placeholder="CC-ANDINA-01"
                      value={formProyecto.codigo_cc}
                      onChange={e => setFormProyecto(p => ({ ...p, codigo_cc: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Ubicación">
                    <input style={inputStyle} placeholder="Frente Norte, Sector 3"
                      value={formProyecto.ubicacion}
                      onChange={e => setFormProyecto(p => ({ ...p, ubicacion: e.target.value }))} />
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/proyectos", formProyecto, () => setFormProyecto({ nombre_proyecto: "", codigo_cc: "", ubicacion: "" }), () => { proyectosPaginado.refresh(); proyectosCompleto.refresh(); })}
                  disabled={saving}
                  style={{ background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
                >
                  <Plus size={14} /> {saving ? "Guardando…" : "Registrar Proyecto"}
                </button>
              </div>

              {/* Buscador de Proyectos */}
              <Buscador
                value={proyectosPaginado.search}
                onChange={e => proyectosPaginado.setSearch(e.target.value)}
                placeholder="Buscar proyectos por nombre, centro de costos o ubicación..."
              />

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52", background: "#0f172a22" }}>
                      {["Centro de Costos", "Nombre del Proyecto", "Ubicación", "Estado", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {proyectosPaginado.data.map((o, idx) => {
                      const isEditing = editingProyectoId === o.id;
                      return (
                        <tr key={o.id} style={{ borderBottom: "1px solid #1c2e52", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          {isEditing ? (
                            <>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditProyecto.codigo_cc}
                                  onChange={e => setFormEditProyecto(prev => ({ ...prev, codigo_cc: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditProyecto.nombre_proyecto}
                                  onChange={e => setFormEditProyecto(prev => ({ ...prev, nombre_proyecto: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditProyecto.ubicacion || ""}
                                  onChange={e => setFormEditProyecto(prev => ({ ...prev, ubicacion: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px" }}
                                  value={formEditProyecto.activa ? "true" : "false"}
                                  onChange={e => setFormEditProyecto(prev => ({ ...prev, activa: e.target.value === "true" }))}
                                >
                                  <option value="true">Activa</option>
                                  <option value="false">Inactiva</option>
                                </select>
                              </td>
                              <td style={{ padding: "8px 16px", display: "flex", gap: "8px" }}>
                                <button
                                  onClick={handleGuardarProyecto}
                                  disabled={saving}
                                  style={{
                                    background: "#16a34a", border: "none", color: "white",
                                    borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                  }}
                                >
                                  <Save size={12} /> Guardar
                                </button>
                                <button
                                  onClick={() => setEditingProyectoId(null)}
                                  disabled={saving}
                                  style={{
                                    background: "#64748b", border: "none", color: "white",
                                    borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                  }}
                                >
                                  <X size={12} /> Cancelar
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "12px 16px", color: "#ff303e", fontWeight: 700, fontSize: "13px" }}>
                                {o.codigo_cc}
                              </td>
                              <td style={{ padding: "12px 16px", color: "white", fontWeight: 600, fontSize: "13px" }}>
                                {o.nombre_proyecto}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>
                                {o.ubicacion || "—"}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{
                                  background: o.activa ? "#dcfce7" : "#fee2e2",
                                  color: o.activa ? "#16a34a" : "#c21a25",
                                  borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700
                                }}>
                                  {o.activa ? "Activa" : "Inactiva"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => {
                                    setEditingProyectoId(o.id);
                                    setFormEditProyecto({
                                      nombre_proyecto: o.nombre_proyecto,
                                      codigo_cc: o.codigo_cc,
                                      ubicacion: o.ubicacion || "",
                                      activa: o.activa
                                    });
                                  }}
                                  style={{
                                    background: "#1e3a5f", border: "1px solid #2563eb",
                                    color: "#60a5fa", borderRadius: "6px", padding: "6px 12px",
                                    fontSize: "11px", fontWeight: 700, cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "4px"
                                  }}
                                >
                                  <Pencil size={10} /> Editar
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {proyectosPaginado.data.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                          No hay proyectos registrados o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Paginador api={proyectosPaginado} label="proyectos" />
              </div>
            </>
          )}

          {/* ==================== PERSONAL ==================== */}
          {tab === "personal" && (
            <>
              <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Gestión de Personal</h1>

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>+ REGISTRAR TRABAJADOR</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                  <FormRow label="RUT *">
                    <input style={inputStyle} placeholder="12.345.678-9"
                      value={formPersonal.rut}
                      onChange={e => setFormPersonal(p => ({ ...p, rut: formatRut(e.target.value) }))} />
                  </FormRow>
                  <FormRow label="Nombre Completo *">
                    <input style={inputStyle} placeholder="Juan Pérez González"
                      value={formPersonal.nombre_completo}
                      onChange={e => setFormPersonal(p => ({ ...p, nombre_completo: e.target.value }))} />
                  </FormRow>
                  <FormRow label="WhatsApp * (569...)">
                    <input style={inputStyle} placeholder="56912345678"
                      value={formPersonal.whatsapp}
                      onChange={e => setFormPersonal(p => ({ ...p, whatsapp: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Rol *">
                    <select style={selectStyle} value={formPersonal.rol}
                      onChange={e => setFormPersonal(p => ({ ...p, rol: e.target.value }))}>
                      {["Operador", "Supervisor", "Rigger", "Jefe de Area"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Turno">
                    <select style={selectStyle} value={formPersonal.turno_tipo}
                      onChange={e => setFormPersonal(p => ({ ...p, turno_tipo: e.target.value }))}>
                      {["14x14", "5x2", "7x7", "Mensual"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Jornada">
                    <select style={selectStyle} value={formPersonal.jornada_tipo}
                      onChange={e => setFormPersonal(p => ({ ...p, jornada_tipo: e.target.value }))}>
                      <option value="Dia">Día</option>
                      <option value="Noche">Noche</option>
                    </select>
                  </FormRow>
                  <FormRow label="Proyecto Actual">
                    <select style={selectStyle} value={formPersonal.proyecto_actual_id}
                      onChange={e => setFormPersonal(p => ({ ...p, proyecto_actual_id: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {proyectosCompleto.data.map(o => <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_proyecto}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Foto de Perfil URL">
                    <input style={inputStyle} placeholder="https://..."
                      value={formPersonal.foto_url}
                      onChange={e => setFormPersonal(p => ({ ...p, foto_url: e.target.value }))} />
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/personal", formPersonal, () => setFormPersonal({ rut: "", nombre_completo: "", whatsapp: "", rol: "Operador", turno_tipo: "14x14", jornada_tipo: "Dia", proyecto_actual_id: "", foto_url: "" }), () => { personalPaginado.refresh(); personalCompleto.refresh(); })}
                  disabled={saving}
                  style={{ background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
                >
                  <Plus size={14} /> {saving ? "Guardando…" : "Registrar Trabajador"}
                </button>
              </div>

              {/* Buscador de Personal */}
              <Buscador
                value={personalPaginado.search}
                onChange={e => personalPaginado.setSearch(e.target.value)}
                placeholder="Buscar personal por nombre, RUT, WhatsApp o rol..."
              />

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52", background: "#0f172a22" }}>
                      {["Foto", "Nombre", "RUT", "WhatsApp", "Rol", "Proyecto", "Turno / Jornada", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {personalPaginado.data.map((p, idx) => {
                      const isEditing = editingPersonalId === p.id;
                      const rolColors = { "Supervisor": "#ff303e", "Jefe de Area": "#c21a25", "Operador": "#2563eb", "Rigger": "#9333ea" };
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1c2e52", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          {isEditing ? (
                            <>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  placeholder="Foto URL"
                                  value={formEditPersonal.foto_url}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, foto_url: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditPersonal.nombre_completo}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, nombre_completo: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditPersonal.rut}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, rut: formatRut(e.target.value) }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditPersonal.whatsapp}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, whatsapp: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px" }}
                                  value={formEditPersonal.rol}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, rol: e.target.value }))}
                                >
                                  {["Operador", "Supervisor", "Rigger", "Jefe de Area"].map(rol => (
                                    <option key={rol} value={rol}>{rol}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px" }}
                                  value={formEditPersonal.proyecto_actual_id || ""}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, proyecto_actual_id: e.target.value || null }))}
                                >
                                  <option value="">Sin asignar</option>
                                  {proyectosCompleto.data.map(o => (
                                    <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_proyecto}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: "8px 16px", display: "flex", gap: "4px" }}>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px", width: "80px" }}
                                  value={formEditPersonal.turno_tipo}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, turno_tipo: e.target.value }))}
                                >
                                  {["14x14", "5x2", "7x7", "Mensual"].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px", width: "80px" }}
                                  value={formEditPersonal.jornada_tipo}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, jornada_tipo: e.target.value }))}
                                >
                                  <option value="Dia">Día</option>
                                  <option value="Noche">Noche</option>
                                </select>
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    onClick={handleGuardarPersonal}
                                    disabled={saving}
                                    style={{
                                      background: "#16a34a", border: "none", color: "white",
                                      borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                      fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                    }}
                                  >
                                    <Save size={12} /> Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingPersonalId(null)}
                                    disabled={saving}
                                    style={{
                                      background: "#64748b", border: "none", color: "white",
                                      borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                      fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                    }}
                                  >
                                    <X size={12} /> Cancelar
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "12px 16px" }}>
                                {p.foto_url ? (
                                  <img
                                    src={p.foto_url}
                                    alt={p.nombre_completo}
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                      border: "1px solid #1c2e52"
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "rgba(37, 99, 235, 0.15)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "#60a5fa",
                                    border: "1px solid #1c2e52"
                                  }}>
                                    {p.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "12px 16px", color: "white", fontWeight: 600, fontSize: "13px" }}>
                                {p.nombre_completo}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>
                                {p.rut}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "13px" }}>
                                {p.whatsapp}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ background: `${rolColors[p.rol]}22`, color: rolColors[p.rol] || "#94a3b8", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                                  {p.rol}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>
                                {p.proyectos ? `${p.proyectos.codigo_cc} — ${p.proyectos.nombre_proyecto.slice(0, 35)}${p.proyectos.nombre_proyecto.length > 35 ? "..." : ""}` : "—"}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>
                                {p.turno_tipo} · {p.jornada_tipo}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => {
                                    setEditingPersonalId(p.id);
                                    setFormEditPersonal({
                                      nombre_completo: p.nombre_completo,
                                      rut: p.rut,
                                      whatsapp: p.whatsapp,
                                      rol: p.rol,
                                      proyecto_actual_id: p.proyecto_actual_id,
                                      turno_tipo: p.turno_tipo || "14x14",
                                      jornada_tipo: p.jornada_tipo || "Dia",
                                      foto_url: p.foto_url || ""
                                    });
                                  }}
                                  style={{
                                    background: "#1e3a5f", border: "1px solid #2563eb",
                                    color: "#60a5fa", borderRadius: "6px", padding: "6px 12px",
                                    fontSize: "11px", fontWeight: 700, cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "4px"
                                  }}
                                >
                                  <Pencil size={10} /> Editar
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {personalPaginado.data.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                          No hay trabajadores registrados o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Paginador api={personalPaginado} label="trabajadores" />
              </div>
            </>
          )}

          {/* ==================== REGISTROS ==================== */}
          {tab === "registros" && (
            <>
              <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Solicitudes de Registro por WhatsApp</h1>

              {/* Solicitudes Pendientes */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#cbd5e1" }}>
                  Solicitudes Pendientes de Aprobación
                </h3>
                <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1c2e52", background: "#0f172a22" }}>
                        {["WhatsApp", "Nombre en WhatsApp", "Rol Solicitado", "Ingresar RUT *", "Proyecto", "Acciones"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registros.data.filter(r => r.estado === "pendiente" && r.nombre_completo).map((r) => {
                        const edit = editRegistros[r.id] || { rut: "", nombre_completo: r.nombre_completo || "", rol_solicitado: r.rol_solicitado || "Operador", proyecto_actual_id: "" };
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid #121e36" }}>
                            <td style={{ padding: "12px 16px", color: "#60a5fa", fontWeight: 700, fontSize: "13px" }}>
                              +{r.whatsapp}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <input
                                style={{ ...inputStyle, padding: "6px 10px" }}
                                value={edit.nombre_completo}
                                onChange={e => setEditRegistros(prev => ({
                                  ...prev,
                                  [r.id]: { ...edit, nombre_completo: e.target.value }
                                }))}
                              />
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <select
                                style={{ ...selectStyle, padding: "6px 10px" }}
                                value={edit.rol_solicitado}
                                onChange={e => setEditRegistros(prev => ({
                                  ...prev,
                                  [r.id]: { ...edit, rol_solicitado: e.target.value }
                                }))}
                              >
                                {["Operador", "Supervisor", "Rigger", "Jefe de Area"].map(rol => (
                                  <option key={rol} value={rol}>{rol}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                               <input
                                 style={{ ...inputStyle, padding: "6px 10px", borderColor: !edit.rut ? "#ef4444" : "#1c2e52" }}
                                 placeholder="12.345.678-9"
                                 value={edit.rut}
                                 onChange={e => setEditRegistros(prev => ({
                                   ...prev,
                                   [r.id]: { ...edit, rut: formatRut(e.target.value) }
                                 }))}
                               />
                             </td>
                            <td style={{ padding: "12px 16px" }}>
                              <select
                                style={{ ...selectStyle, padding: "6px 10px" }}
                                value={edit.proyecto_actual_id || ""}
                                onChange={e => setEditRegistros(prev => ({
                                  ...prev,
                                  [r.id]: { ...edit, proyecto_actual_id: e.target.value }
                                }))}
                              >
                                <option value="">Sin asignar</option>
                                {proyectosCompleto.data.map(o => (
                                  <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_proyecto}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleAprobarRegistro(r.id)}
                                disabled={saving}
                                style={{
                                  background: "#16a34a", border: "none", color: "white",
                                  borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                  fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                }}
                              >
                                <CheckCircle size={12} /> Aprobar
                              </button>
                              <button
                                onClick={() => setRechazoId(r.id)}
                                disabled={saving}
                                style={{
                                  background: "#c21a25", border: "none", color: "white",
                                  borderRadius: "6px", padding: "6px 12px", fontSize: "12px",
                                  fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                }}
                              >
                                <XCircle size={12} /> Rechazar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {registros.data.filter(r => r.estado === "pendiente" && r.nombre_completo).length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            No hay solicitudes de registro pendientes de aprobación.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial de Solicitudes */}
              <div>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#cbd5e1" }}>
                  Historial de Solicitudes Procesadas
                </h3>
                <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1c2e52", background: "#0f172a22" }}>
                        {["Fecha", "WhatsApp", "Nombre", "Rol", "Estado", "Detalle"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registros.data.filter(r => r.estado !== "pendiente").map((r, idx) => {
                        const isAprobado = r.estado === "aprobado";
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid #121e36", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                            <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                              {new Date(r.created_at).toLocaleDateString("es-CL")}
                            </td>
                            <td style={{ padding: "12px 16px", color: "#cbd5e1", fontSize: "13px" }}>
                              +{r.whatsapp}
                            </td>
                            <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>
                              {r.nombre_completo}
                            </td>
                            <td style={{ padding: "12px 16px", color: "#cbd5e1", fontSize: "13px" }}>
                              {r.rol_solicitado}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{
                                background: isAprobado ? "#dcfce7" : "#fee2e2",
                                color: isAprobado ? "#16a34a" : "#c21a25",
                                border: `1px solid ${isAprobado ? "#86efac" : "#fca5a5"}`,
                                borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: 700
                              }}>
                                {isAprobado ? "Aprobado" : "Rechazado"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isAprobado ? "Aprobado e ingresado a personal" : (r.nota_rechazo || "Sin nota")}
                            </td>
                          </tr>
                        );
                      })}
                      {registros.data.filter(r => r.estado !== "pendiente").length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            No hay solicitudes procesadas previamente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ==================== REPORTES ==================== */}
          {tab === "reportes" && (
            <>
              <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Historial de Reportes</h1>

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52" }}>
                      {["Fecha", "Equipo", "Operador", "Hr. Inicio", "Hr. Final", "Horas", "PDF"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.data.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < reportes.data.length - 1 ? "1px solid #121e36" : "none", background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                        <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.fecha}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ color: "#ff303e", fontWeight: 700, fontSize: "12px" }}>{r.equipos?.codigo_interno}</div>
                          <div style={{ color: "#64748b", fontSize: "11px" }}>{r.equipos?.descripcion_equipo?.slice(0, 25)}</div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>{r.personal?.nombre_completo}</td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.horometro_inicio?.toLocaleString("es-CL")}</td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.horometro_final?.toLocaleString("es-CL") || "—"}</td>
                        <td style={{ padding: "12px 16px", color: r.horas_trabajadas ? "#16a34a" : "#64748b", fontWeight: 700, fontSize: "13px" }}>
                          {r.horas_trabajadas ? `${r.horas_trabajadas} hrs` : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {r.pdf_url ? (
                            <a
                              href={r.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: "#1e3a5f", border: "1px solid #2563eb",
                                color: "#60a5fa", borderRadius: "6px", padding: "4px 10px",
                                fontSize: "11px", fontWeight: 700, textDecoration: "none",
                                display: "inline-flex", alignItems: "center", gap: "4px",
                              }}
                            >
                              <FileText size={10} /> Descargar
                            </a>
                          ) : (
                            <span style={{ color: "#1c2e52", fontSize: "12px" }}>Sin PDF</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {reportes.data.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                          No hay reportes generados aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
