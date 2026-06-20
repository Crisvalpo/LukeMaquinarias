import React from "react";
import Head from "next/head";
import Link from "next/link";
import {
  LayoutGrid, MapPin, HardHat, Building2, Users, FileText, MessageSquare
} from "lucide-react";
import { useAdminMaquinaria } from "../components/admin/hooks/useAdminMaquinaria";
import ConsoleTab from "../components/admin/ConsoleTab";
import MapTab from "../components/admin/MapTab";
import EquiposTab from "../components/admin/EquiposTab";
import ProyectosTab from "../components/admin/ProyectosTab";
import PersonalTab from "../components/admin/PersonalTab";
import RegistrosTab from "../components/admin/RegistrosTab";
import ReportesTab from "../components/admin/ReportesTab";

export default function AdminMaquinaria() {
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
      default:
        return <ConsoleTab hookProps={hookProps} />;
    }
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

          {renderActiveTab()}
        </div>
      </div>
    </>
  );
}
