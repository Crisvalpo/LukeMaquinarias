import React from "react";
import Head from "next/head";
import Link from "next/link";
import {
  LayoutGrid, MapPin, HardHat, Building2, Users, FileText, MessageSquare, CalendarDays
} from "lucide-react";
import { useAdminMaquinaria } from "../components/admin/hooks/useAdminMaquinaria";
import ConsoleTab from "../components/admin/ConsoleTab";
import AdminAuthWrapper from "../components/admin/Shared/AdminAuthWrapper";
import MapTab from "../components/admin/MapTab";
import EquiposTab from "../components/admin/EquiposTab";
import ProyectosTab from "../components/admin/ProyectosTab";
import PersonalTab from "../components/admin/PersonalTab";
import RegistrosTab from "../components/admin/RegistrosTab";
import ReportesTab from "../components/admin/ReportesTab";
import PlanificacionPodTab from "../components/admin/PlanificacionPodTab";

export default function AdminMaquinaria({ currentUser, onChangeUser }) {
  const hookProps = useAdminMaquinaria();
  const { tab, setTab, msg, registros } = hookProps;

  const TABS = [
    { id: "monitor", label: "Consola", icon: LayoutGrid },
    { id: "mapa", label: "Mapa Faena", icon: MapPin },
    { id: "equipos", label: "Equipos", icon: HardHat },
    { id: "proyectos", label: "Proyectos", icon: Building2 },
    { id: "personal", label: "Personal", icon: Users },
    { id: "registros", label: "Registros", icon: Users },
    { id: "reportes", label: "Reportes", icon: FileText },
    { id: "pod", label: "Plan POD", icon: CalendarDays },
  ];

  const renderActiveTab = () => {
    switch (tab) {
      case "monitor":
        return <ConsoleTab hookProps={hookProps} />;
      case "mapa":
        return <MapTab hookProps={hookProps} />;
      case "equipos":
        return <EquiposTab hookProps={hookProps} />;
      case "proyectos":
        return <ProyectosTab hookProps={hookProps} />;
      case "personal":
        return <PersonalTab hookProps={hookProps} />;
      case "registros":
        return <RegistrosTab hookProps={hookProps} />;
      case "reportes":
        return <ReportesTab hookProps={hookProps} />;
      case "pod":
        return <PlanificacionPodTab hookProps={hookProps} currentUser={currentUser} />;
      default:
        return <ConsoleTab hookProps={hookProps} />;
    }
  };

  return (
    <AdminAuthWrapper>
      <Head>
        <title>LukeEquipos — Control de Maquinaria</title>
        <meta name="description" content="Sistema de Control Operacional por Voz y Gestión de Maquinaria Pesada en Faena" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        backgroundImage: "linear-gradient(rgba(253, 253, 251, 0.94), rgba(253, 253, 251, 0.94)), url('https://www.arcus-global.com/wp/wp-content/uploads/2016/04/mquinaria-arcus-global_opt.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Inter', sans-serif",
        color: "var(--color-text)",
      }}>
 
        {/* ========== SIDEBAR ========== */}
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: "220px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
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
            <div style={{ color: "var(--color-text-muted)", fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", paddingLeft: "2px", marginTop: "10px" }}>
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
                    background: active ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" : "transparent",
                    color: active ? "white" : "var(--color-text-muted)",
                    cursor: "pointer", fontSize: "13px", fontWeight: active ? 700 : 500,
                    marginBottom: "4px", transition: "all 0.2s",
                    textAlign: "left",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)"; }}
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
 
          {/* Usuario activo */}
          {currentUser && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-sidebar)" }}>
              <div style={{
                background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "8px", padding: "10px 12px",
              }}>
                <div style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>Sesión activa</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)", lineHeight: 1.3 }}>{currentUser.nombre_completo}</div>
                {currentUser.proyecto && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{currentUser.proyecto.codigo_cc}</div>
                )}
                <button
                  onClick={onChangeUser}
                  style={{
                    marginTop: "8px", width: "100%", background: "transparent",
                    border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px",
                    color: "#10b981", fontSize: "11px", fontWeight: 700, padding: "5px 8px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Cambiar usuario
                </button>
              </div>
            </div>
          )}

          {/* Botón Vincular WhatsApp */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-sidebar)" }}>
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
 
          {/* Botón Cerrar Sesión */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-sidebar)" }}>
            <button
              onClick={() => {
                localStorage.removeItem("luke_auth");
                window.location.reload();
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 12px", borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                cursor: "pointer", fontSize: "12px", fontWeight: 700,
                transition: "all 0.2s",
                textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", marginRight: "4px" }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
 
          {/* Footer sidebar */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-sidebar)" }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>equipos.lukeapp.me</div>
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

          {renderActiveTab()}
        </div>
      </div>
    </AdminAuthWrapper>
  );
}
