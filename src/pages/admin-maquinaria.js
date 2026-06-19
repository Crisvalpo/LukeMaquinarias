import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  HardHat, Wrench, Building2, Users, LayoutGrid, FileText,
  Plus, RefreshCw, ChevronRight, AlertTriangle, Clock,
  CheckCircle, Coffee, XCircle, Pencil, Save, X, ThumbsUp, ThumbsDown, MessageSquare, MapPin, Map, QrCode
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

// ================================================================
// TARJETA DE EQUIPO (Monitor)
// ================================================================
function EquipoCard({ equipo, onPautaClick }) {
  const cfg = ESTADO_CONFIG[equipo.estado_actual] || ESTADO_CONFIG["Disponible"];
  const Icono = cfg.icon;

  return (
    <div
      className="equipo-card"
      style={{
        background: "#121e36",
        border: `2px solid ${cfg.border}`,
        borderRadius: "12px",
        padding: "18px",
        position: "relative",
        overflow: "hidden",
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
      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "10px" }}>
        {equipo.proveedor}
        {equipo.obras && (
          <span style={{ marginLeft: "8px", color: "#475569" }}>
            · 📍 {equipo.obras.nombre_obra}
          </span>
        )}
      </div>

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

  const messageText = `REPORTE:${equipo.codigo_interno}`;
  const waLink = `https://wa.me/${botPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(messageText)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(waLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(waLink);
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
          Al escanear este QR con el móvil, el operador abrirá un chat con el bot prellenando el comando de inicio de turno.
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
// PÁGINA PRINCIPAL
// ================================================================
export default function AdminMaquinaria() {
  const [tab, setTab] = useState("monitor");
  const [pautaEquipo, setPautaEquipo] = useState(null);
  const pollRef = useRef(null);

  // Datos
  const equipos = useApi("/api/equipos", [tab]);
  const obras = useApi("/api/obras", [tab]);
  const personal = useApi("/api/personal", [tab]);
  const reportes = useApi("/api/reportes", [tab]);
  const registros = useApi("/api/registros", [tab]);

  // Referencias para el mapa Leaflet
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  // Inicializar mapa de geolocalización cuando se cambia a la pestaña 'mapa'
  useEffect(() => {
    if (tab !== "mapa" || typeof window === "undefined" || equipos.loading) return;

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

      const equiposConCoordenadas = equipos.data.filter(e => e.latitud_actual && e.longitud_actual);

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
              <span style="color: #cbd5e1; font-weight: 600;">${e.obras?.nombre_obra || "Sin proyecto"}</span>
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
    };
  }, [tab, equipos.data, equipos.loading]);

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
    pollRef.current = setInterval(() => equipos.refresh(true), 10000);
    return () => clearInterval(pollRef.current);
  }, [tab]);

  // ---- Formularios ----
  const [formEquipo, setFormEquipo] = useState({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", obra_actual_id: "" });
  const [formObra, setFormObra] = useState({ nombre_obra: "", codigo_cc: "", ubicacion: "" });
  const [formPersonal, setFormPersonal] = useState({ rut: "", nombre_completo: "", whatsapp: "", rol: "Operador", turno_tipo: "14x14", jornada_tipo: "Dia", obra_actual_id: "" });
  const [editingObraId, setEditingObraId] = useState(null);
  const [formEditObra, setFormEditObra] = useState({ nombre_obra: "", codigo_cc: "", ubicacion: "", activa: true });
  const [editingPersonalId, setEditingPersonalId] = useState(null);
  const [formEditPersonal, setFormEditPersonal] = useState({ nombre_completo: "", rut: "", whatsapp: "", rol: "Operador", obra_actual_id: "", turno_tipo: "14x14", jornada_tipo: "Dia" });
  const [botPhone, setBotPhone] = useState("");
  const [qrEquipo, setQrEquipo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bot_phone");
      setBotPhone(saved || process.env.NEXT_PUBLIC_BOT_PHONE || "56911110001");
    }
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

  const handleGuardarObra = async () => {
    if (!formEditObra.nombre_obra || !formEditObra.codigo_cc) {
      showMsg("❌ Nombre del proyecto y Centro de Costos son obligatorios", false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/obras", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingObraId, ...formEditObra }),
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Proyecto actualizado con éxito");
        setEditingObraId(null);
        obras.refresh();
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
        personal.refresh();
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
          obra_actual_id: editInfo.obra_actual_id || null
        })
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Solicitud aprobada con éxito");
        registros.refresh();
        personal.refresh();
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
    { id: "obras", label: "Proyectos", icon: Building2 },
    { id: "personal", label: "Personal", icon: Users },
    { id: "registros", label: "Registros", icon: Users },
    { id: "reportes", label: "Reportes", icon: FileText },
  ];

  const statsCounts = {
    "Equipo Operativo": equipos.data.filter(e => e.estado_actual === "Equipo Operativo").length,
    "Disponible": equipos.data.filter(e => e.estado_actual === "Disponible").length,
    "En Colacion": equipos.data.filter(e => e.estado_actual === "En Colacion").length,
    "Detenido por Falla": equipos.data.filter(e => e.estado_actual === "Detenido por Falla").length,
  };

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
              const pendientesCount = t.id === "registros" ? registros.data.filter(r => r.estado === "pendiente").length : 0;
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
              onSave={() => { setPautaEquipo(null); equipos.refresh(true); }}
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
                  onClick={() => equipos.refresh(true)}
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
                    {equipos.data.map(e => {
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
                          <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>Proyecto: {e.obras?.nombre_obra || "Sin proyecto"}</div>
                          
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
                    {equipos.data.length} equipos · Actualización automática cada 10s
                  </p>
                </div>
                <button
                  onClick={() => equipos.refresh(true)}
                  style={{
                    background: "#121e36", border: "1px solid #1c2e52",
                    borderRadius: "8px", padding: "8px 14px", color: "#94a3b8",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
                  }}
                >
                  <RefreshCw size={13} /> Actualizar
                </button>
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

              {/* Grid de equipos */}
              {equipos.loading ? (
                <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>Cargando equipos…</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {equipos.data.map(eq => (
                    <EquipoCard key={eq.id} equipo={eq} onPautaClick={setPautaEquipo} />
                  ))}
                  {equipos.data.length === 0 && (
                    <div style={{ color: "#64748b", gridColumn: "1/-1", textAlign: "center", padding: "60px" }}>
                      No hay equipos registrados aún.
                    </div>
                  )}
                </div>
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
                    onClick={() => {
                      localStorage.setItem("bot_phone", botPhone);
                      showMsg("✅ Teléfono del bot guardado");
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
                      value={formEquipo.obra_actual_id}
                      onChange={e => setFormEquipo(p => ({ ...p, obra_actual_id: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {obras.data.map(o => <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_obra}</option>)}
                    </select>
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/equipos", formEquipo, () => setFormEquipo({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", obra_actual_id: "" }), equipos.refresh)}
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

              {/* Tabla equipos */}
              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52" }}>
                      {["Código", "Descripción", "Proveedor", "Proyecto", "Estado", "QR"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {equipos.data.map((eq, i) => {
                      const cfg = ESTADO_CONFIG[eq.estado_actual] || ESTADO_CONFIG["Disponible"];
                      return (
                        <tr key={eq.id} style={{ borderBottom: i < equipos.data.length - 1 ? "1px solid #121e36" : "none", background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          <td style={{ padding: "12px 16px", color: "#ff303e", fontWeight: 700, fontSize: "13px" }}>{eq.codigo_interno}</td>
                          <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>{eq.descripcion_equipo}</td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.proveedor}</td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.obras?.nombre_obra || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button
                              onClick={() => setQrEquipo(eq)}
                              style={{
                                background: "#1e3a5f", border: "1px solid #2563eb",
                                color: "#60a5fa", borderRadius: "6px", padding: "6px 12px",
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
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ==================== OBRAS ==================== */}
          {tab === "obras" && (
            <>
              <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Gestión de Proyectos</h1>

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>+ REGISTRAR NUEVO PROYECTO</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <FormRow label="Nombre Proyecto *">
                    <input style={inputStyle} placeholder="Andina Fase 2"
                      value={formObra.nombre_obra}
                      onChange={e => setFormObra(p => ({ ...p, nombre_obra: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Centro de Costos *">
                    <input style={inputStyle} placeholder="CC-ANDINA-01"
                      value={formObra.codigo_cc}
                      onChange={e => setFormObra(p => ({ ...p, codigo_cc: e.target.value }))} />
                  </FormRow>
                  <FormRow label="Ubicación">
                    <input style={inputStyle} placeholder="Frente Norte, Sector 3"
                      value={formObra.ubicacion}
                      onChange={e => setFormObra(p => ({ ...p, ubicacion: e.target.value }))} />
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/obras", formObra, () => setFormObra({ nombre_obra: "", codigo_cc: "", ubicacion: "" }), obras.refresh)}
                  disabled={saving}
                  style={{ background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
                >
                  <Plus size={14} /> {saving ? "Guardando…" : "Registrar Proyecto"}
                </button>
              </div>

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
                    {obras.data.map((o, idx) => {
                      const isEditing = editingObraId === o.id;
                      return (
                        <tr key={o.id} style={{ borderBottom: "1px solid #1c2e52", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          {isEditing ? (
                            <>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditObra.codigo_cc}
                                  onChange={e => setFormEditObra(prev => ({ ...prev, codigo_cc: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditObra.nombre_obra}
                                  onChange={e => setFormEditObra(prev => ({ ...prev, nombre_obra: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <input
                                  style={{ ...inputStyle, padding: "6px 10px" }}
                                  value={formEditObra.ubicacion || ""}
                                  onChange={e => setFormEditObra(prev => ({ ...prev, ubicacion: e.target.value }))}
                                />
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                <select
                                  style={{ ...selectStyle, padding: "6px 10px" }}
                                  value={formEditObra.activa ? "true" : "false"}
                                  onChange={e => setFormEditObra(prev => ({ ...prev, activa: e.target.value === "true" }))}
                                >
                                  <option value="true">Activa</option>
                                  <option value="false">Inactiva</option>
                                </select>
                              </td>
                              <td style={{ padding: "8px 16px", display: "flex", gap: "8px" }}>
                                <button
                                  onClick={handleGuardarObra}
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
                                  onClick={() => setEditingObraId(null)}
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
                                {o.nombre_obra}
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
                                    setEditingObraId(o.id);
                                    setFormEditObra({
                                      nombre_obra: o.nombre_obra,
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
                    {obras.data.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                          No hay proyectos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                      onChange={e => setFormPersonal(p => ({ ...p, rut: e.target.value }))} />
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
                    <select style={selectStyle} value={formPersonal.obra_actual_id}
                      onChange={e => setFormPersonal(p => ({ ...p, obra_actual_id: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {obras.data.map(o => <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_obra}</option>)}
                    </select>
                  </FormRow>
                </div>
                <button
                  onClick={() => handleSubmit("/api/personal", formPersonal, () => setFormPersonal({ rut: "", nombre_completo: "", whatsapp: "", rol: "Operador", turno_tipo: "14x14", jornada_tipo: "Dia", obra_actual_id: "" }), personal.refresh)}
                  disabled={saving}
                  style={{ background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
                >
                  <Plus size={14} /> {saving ? "Guardando…" : "Registrar Trabajador"}
                </button>
              </div>

              <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1c2e52", background: "#0f172a22" }}>
                      {["Nombre", "RUT", "WhatsApp", "Rol", "Proyecto", "Turno / Jornada", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {personal.data.map((p, idx) => {
                      const isEditing = editingPersonalId === p.id;
                      const rolColors = { "Supervisor": "#ff303e", "Jefe de Area": "#c21a25", "Operador": "#2563eb", "Rigger": "#9333ea" };
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1c2e52", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                          {isEditing ? (
                            <>
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
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, rut: e.target.value }))}
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
                                  value={formEditPersonal.obra_actual_id || ""}
                                  onChange={e => setFormEditPersonal(prev => ({ ...prev, obra_actual_id: e.target.value || null }))}
                                >
                                  <option value="">Sin asignar</option>
                                  {obras.data.map(o => (
                                    <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_obra}</option>
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
                                {p.obras ? `${p.obras.codigo_cc} — ${p.obras.nombre_obra.slice(0, 35)}${p.obras.nombre_obra.length > 35 ? "..." : ""}` : "—"}
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
                                      obra_actual_id: p.obra_actual_id,
                                      turno_tipo: p.turno_tipo || "14x14",
                                      jornada_tipo: p.jornada_tipo || "Dia"
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
                  </tbody>
                </table>
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
                      {registros.data.filter(r => r.estado === "pendiente").map((r) => {
                        const edit = editRegistros[r.id] || { rut: "", nombre_completo: r.nombre_completo || "", rol_solicitado: r.rol_solicitado || "Operador", obra_actual_id: "" };
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
                                  [r.id]: { ...edit, rut: e.target.value }
                                }))}
                              />
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <select
                                style={{ ...selectStyle, padding: "6px 10px" }}
                                value={edit.obra_actual_id || ""}
                                onChange={e => setEditRegistros(prev => ({
                                  ...prev,
                                  [r.id]: { ...edit, obra_actual_id: e.target.value }
                                }))}
                              >
                                <option value="">Sin asignar</option>
                                {obras.data.map(o => (
                                  <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_obra}</option>
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
                      {registros.data.filter(r => r.estado === "pendiente").length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
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
