import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  LayoutGrid, MapPin, HardHat, Building2, Users, FileText,
  MessageSquare, CalendarDays, ChevronLeft, ChevronRight,
  User, Loader2, Tag
} from "lucide-react";
import { useAdminMaquinaria } from "../components/admin/hooks/useAdminMaquinaria";
import { useCurrentUser } from "../components/admin/hooks/useCurrentUser";
import ConsoleTab from "../components/admin/ConsoleTab";
import AdminAuthWrapper from "../components/admin/Shared/AdminAuthWrapper";
import MapTab from "../components/admin/MapTab";
import EquiposTab from "../components/admin/EquiposTab";
import ProyectosTab from "../components/admin/ProyectosTab";
import PersonalTab from "../components/admin/PersonalTab";
import RegistrosTab from "../components/admin/RegistrosTab";
import ReportesTab from "../components/admin/ReportesTab";
import PlanificacionPodTab from "../components/admin/PlanificacionPodTab";
import EspecialidadesTab from "../components/admin/EspecialidadesTab";

const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 58;
const STORAGE_KEY_USER = "luke_user";

// ================================================================
// Panel de selección de identidad (overlay)
// ================================================================
function IdentitySelector({ onSelect, onSkip }) {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const COLOR_FALLBACK = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316"];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/personal");
        const j = await r.json();
        if (j.success) {
          // Solo supervisores y jefes de área
          setPersonal((j.data || []).filter(p =>
            p.rol === "Supervisor" || p.rol === "Jefe de Area"
          ));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtrados = personal.filter(p =>
    p.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    (p.proyectos?.codigo_cc || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(6, 9, 20, 0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: "rgba(15, 25, 45, 0.98)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", padding: "32px",
        width: "min(480px, 94vw)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <User size={22} color="#10b981" />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "white", margin: "0 0 6px" }}>
            ¿Quién eres?
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Filtrará el POD según tu proyecto asignado
          </p>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por nombre o proyecto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px", color: "white", padding: "11px 14px",
            fontSize: "13px", outline: "none", marginBottom: "14px",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />

        {/* Lista */}
        <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px", color: "#64748b", gap: "8px", alignItems: "center" }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Cargando...
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "13px" }}>Sin resultados</div>
          ) : filtrados.map((persona, idx) => {
            const color = persona.especialidades?.color || COLOR_FALLBACK[idx % COLOR_FALLBACK.length];
            return (
              <button
                key={persona.id}
                onClick={() => onSelect(persona)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px", padding: "11px 14px", cursor: "pointer",
                  color: "white", textAlign: "left", width: "100%", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}50`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  background: `${color}25`, border: `1.5px solid ${color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 800, color,
                }}>
                  {persona.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {persona.nombre_completo}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                    {persona.rol}
                    {persona.proyectos && <span style={{ color }}> · {persona.proyectos.codigo_cc}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Omitir */}
        <button
          onClick={onSkip}
          style={{
            width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", color: "#64748b", padding: "10px",
            fontSize: "13px", cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
          onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
        >
          Continuar sin seleccionar (ver todos los proyectos)
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ================================================================
// PAGE PRINCIPAL
// ================================================================
export default function AdminMaquinaria() {
  const hookProps = useAdminMaquinaria();
  const { tab, setTab, msg, registros } = hookProps;

  // Identidad gestionada directamente desde localStorage
  const { currentUser, setCurrentUser, clearUser, loaded } = useCurrentUser();
  const [showIdentitySelector, setShowIdentitySelector] = useState(false);

  // Mostrar selector de identidad si aún no hay usuario guardado (primera vez)
  useEffect(() => {
    if (loaded && currentUser === null) {
      setShowIdentitySelector(true);
    }
  }, [loaded, currentUser]);

  // Auto-colapsar sidebar al entrar a POD
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    if (tab === "pod") setSidebarCollapsed(true);
  }, [tab]);

  const sidebarW = sidebarCollapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  const handleSelectIdentity = (persona) => {
    const user = {
      id: persona.id,
      nombre_completo: persona.nombre_completo,
      rol: persona.rol,
      proyecto_actual_id: persona.proyecto_actual_id || null,
      proyecto: persona.proyectos || null,
    };
    setCurrentUser(user);
    setShowIdentitySelector(false);
  };

  const handleSkipIdentity = () => {
    setShowIdentitySelector(false);
  };

  const handleChangeUser = () => {
    clearUser();
    setShowIdentitySelector(true);
  };

  const TABS = [
    { id: "monitor",        label: "Consola",     icon: LayoutGrid },
    { id: "mapa",           label: "Mapa Faena",  icon: MapPin },
    { id: "equipos",        label: "Equipos",     icon: HardHat },
    { id: "proyectos",      label: "Proyectos",   icon: Building2 },
    { id: "especialidades", label: "Disciplinas", icon: Tag },
    { id: "personal",       label: "Personal",    icon: Users },
    { id: "registros",      label: "Registros",   icon: Users },
    { id: "reportes",       label: "Reportes",    icon: FileText },
    { id: "pod",            label: "Sala POD",    icon: CalendarDays },
  ];

  const renderActiveTab = () => {
    switch (tab) {
      case "monitor":        return <ConsoleTab hookProps={hookProps} />;
      case "mapa":           return <MapTab hookProps={hookProps} />;
      case "equipos":        return <EquiposTab hookProps={hookProps} />;
      case "proyectos":      return <ProyectosTab hookProps={hookProps} />;
      case "especialidades": return <EspecialidadesTab hookProps={hookProps} />;
      case "personal":       return <PersonalTab hookProps={hookProps} />;
      case "registros":      return <RegistrosTab hookProps={hookProps} />;
      case "reportes":       return <ReportesTab hookProps={hookProps} />;
      case "pod":            return <PlanificacionPodTab hookProps={hookProps} currentUser={currentUser} />;
      default:               return <ConsoleTab hookProps={hookProps} />;
    }
  };

  const pendientesCount = registros.data.filter(r => r.estado === "pendiente" && r.nombre_completo).length;

  return (
    <AdminAuthWrapper>
      <Head>
        <title>LukeEquipos — Control de Maquinaria</title>
        <meta name="description" content="Sistema de Control Operacional por Voz y Gestión de Maquinaria Pesada en Faena" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Selector de identidad (overlay) */}
      {showIdentitySelector && (
        <IdentitySelector
          onSelect={handleSelectIdentity}
          onSkip={handleSkipIdentity}
        />
      )}

      <div style={{
        minHeight: "100vh",
        backgroundImage: "linear-gradient(rgba(253, 253, 251, 0.94), rgba(253, 253, 251, 0.94)), url('https://www.arcus-global.com/wp/wp-content/uploads/2016/04/mquinaria-arcus-global_opt.jpg')",
        backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed",
        fontFamily: "'Inter', sans-serif", color: "var(--color-text)",
      }}>

        {/* ========== SIDEBAR ========== */}
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: `${sidebarW}px`,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
          display: "flex", flexDirection: "column",
          zIndex: 100,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}>

          {/* Logo + toggle */}
          <div style={{
            padding: sidebarCollapsed ? "16px 0" : "20px 20px 12px",
            display: "flex", alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            flexShrink: 0, transition: "padding 0.25s",
          }}>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <img
                  src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
                  alt="EIMISA Logo"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                <div style={{ color: "var(--color-text-muted)", fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginTop: "8px" }}>
                  Control Maquinaria
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
              style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                color: "#10b981", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.2s",
                marginLeft: sidebarCollapsed ? 0 : "8px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: sidebarCollapsed ? "8px 6px" : "8px 12px", overflowY: "auto", overflowX: "hidden" }}>
            {TABS.map(t => {
              const Icono = t.icon;
              const active = tab === t.id;
              const badgeCount = t.id === "registros" ? pendientesCount : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={sidebarCollapsed ? t.label : undefined}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: sidebarCollapsed ? 0 : "10px",
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                    padding: sidebarCollapsed ? "10px 0" : "10px 12px",
                    borderRadius: "8px", border: "none",
                    background: active
                      ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)"
                      : "transparent",
                    color: active ? "white" : "var(--color-text-muted)",
                    cursor: "pointer", fontSize: "13px", fontWeight: active ? 700 : 500,
                    marginBottom: "2px", transition: "all 0.2s",
                    textAlign: "left", position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  {sidebarCollapsed && active && (
                    <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: "3px", borderRadius: "0 2px 2px 0", background: "white" }} />
                  )}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Icono size={16} />
                    {sidebarCollapsed && badgeCount > 0 && (
                      <span style={{ position: "absolute", top: "-4px", right: "-6px", background: "#ef4444", color: "white", borderRadius: "50%", width: "14px", height: "14px", fontSize: "8px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {badgeCount}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
                      {badgeCount > 0 && (
                        <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 8px rgba(239, 68, 68, 0.4)" }}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Usuario activo expandido */}
          {!sidebarCollapsed && currentUser && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-sidebar)", flexShrink: 0 }}>
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>Sesión activa</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)", lineHeight: 1.3 }}>{currentUser.nombre_completo}</div>
                {currentUser.proyecto && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{currentUser.proyecto.codigo_cc}</div>
                )}
                <button
                  onClick={handleChangeUser}
                  style={{ marginTop: "8px", width: "100%", background: "transparent", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", color: "#10b981", fontSize: "11px", fontWeight: 700, padding: "5px 8px", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Cambiar usuario
                </button>
              </div>
            </div>
          )}

          {/* Usuario activo colapsado (avatar) */}
          {sidebarCollapsed && currentUser && (
            <div style={{ padding: "8px 0", borderTop: "1px solid var(--border-sidebar)", flexShrink: 0, display: "flex", justifyContent: "center" }}>
              <div
                title={`${currentUser.nombre_completo}${currentUser.proyecto ? ` · ${currentUser.proyecto.codigo_cc}` : ""}\nHaz clic para cambiar`}
                onClick={handleChangeUser}
                style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#10b981", cursor: "pointer" }}
              >
                {currentUser.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
            </div>
          )}

          {/* Puente WhatsApp */}
          <div style={{ padding: sidebarCollapsed ? "8px 0" : "8px 12px", borderTop: "1px solid var(--border-sidebar)", flexShrink: 0, display: "flex", justifyContent: sidebarCollapsed ? "center" : "stretch" }}>
            <Link href="/qr-puente" style={{ textDecoration: "none", width: "100%" }}>
              <div
                title={sidebarCollapsed ? "Puente WhatsApp" : undefined}
                style={{ display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: "8px", padding: sidebarCollapsed ? "10px 0" : "10px 12px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer", fontSize: "12px", fontWeight: 700, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
              >
                <MessageSquare size={14} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span>Puente WhatsApp</span>}
              </div>
            </Link>
          </div>

          {/* Cerrar sesión */}
          <div style={{ padding: sidebarCollapsed ? "8px 0" : "8px 12px", borderTop: "1px solid var(--border-sidebar)", flexShrink: 0, display: "flex", justifyContent: sidebarCollapsed ? "center" : "stretch" }}>
            <button
              title={sidebarCollapsed ? "Cerrar sesión" : undefined}
              onClick={() => { localStorage.removeItem("luke_auth"); localStorage.removeItem(STORAGE_KEY_USER); window.location.reload(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: "8px", padding: sidebarCollapsed ? "10px 0" : "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: 700, transition: "all 0.2s", textAlign: "left" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!sidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-sidebar)", flexShrink: 0 }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>equipos.lukeapp.me</div>
            </div>
          )}
        </div>

        {/* ========== CONTENIDO PRINCIPAL ========== */}
        <div style={{
          marginLeft: `${sidebarW}px`,
          padding: tab === "pod" ? "0" : "28px 32px",
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: "100vh",
        }}>
          {msg && (
            <div style={{ position: "fixed", top: "20px", right: "20px", background: msg.ok ? "#16a34a" : "#c21a25", color: "white", padding: "12px 20px", borderRadius: "8px", fontWeight: 600, fontSize: "13px", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
              {msg.text}
            </div>
          )}
          {renderActiveTab()}
        </div>
      </div>
    </AdminAuthWrapper>
  );
}
