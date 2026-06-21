import React, { useState } from "react";
import { Search, RefreshCw, Building2 } from "lucide-react";
import { ESTADO_CONFIG } from "./Shared/constants";
import EquipoCard from "./Shared/EquipoCard";
import PautaModal from "./Shared/PautaModal";
import HistorialModal from "./Shared/HistorialModal";

export default function ConsoleTab({ hookProps }) {
  const {
    equiposFiltrados,
    equiposCompleto,
    equiposPaginado,
    filtroCategoria,
    setFiltroCategoria,
    filtroEstado,
    setFiltroEstado,
    filtroComercial,
    setFiltroComercial,
    searchMonitor,
    setSearchMonitor,
    agruparPorProyecto,
    setAgruparPorProyecto,
    soloCombustibleCritico,
    setSoloCombustibleCritico,
    statsCounts,
    gruposProyectos,
    pautaEquipo,
    setPautaEquipo,
    showMsg
  } = hookProps;

  const [historialEquipo, setHistorialEquipo] = useState(null);

  const CATEGORIAS_MAESTRAS = ["TODAS", "GRÚAS", "CAMIONES", "MAQUINARIA PESADA", "MAQUINARIA SEMIPESADA", "VEHÍCULOS MENORES", "EQUIPOS MENORES"];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Consola de Monitoreo</h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "13px" }}>
            {equiposFiltrados.length} equipos filtrados (de {equiposCompleto.data.length} totales) · Actualización automática cada 10s
          </p>
        </div>
        <button
          onClick={() => equiposCompleto.refresh(true)}
          style={{
            background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-sm)", padding: "8px 14px", color: "var(--color-text)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
          }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Panel de Controles de Filtros y Agrupamiento (Glassmorphism) */}
      <div
        style={{
          background: "var(--bg-container)",
          border: "1px solid var(--border-container)",
          borderRadius: "var(--border-radius-base)",
          padding: "20px",
          marginBottom: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Buscador de Monitoreo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)",
                padding: "11px 16px 11px 40px",
                fontSize: "13px",
                outline: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={e => e.target.style.borderColor = "var(--border-input)"}
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
                    border: active ? "1px solid var(--color-primary)" : "1px solid var(--border-container)", background: active ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" : "var(--bg-input)", color: active ? "white" : "var(--color-text-muted)",
                    fontSize: "12px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "none",
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
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-container)" }}>
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
                      border: active ? `1.5px solid ${color}` : "1px solid var(--border-container)", background: active ? activeBg : "var(--bg-input)", color: active ? color : "var(--color-text-muted)",
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

          {/* Filtro Comercial */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Clasificación Comercial
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "TODOS", label: "Todos" },
                { id: "OPERATIVO - EN USO", label: "En Obra" },
                { id: "DISPONIBLE PARA ARRIENDO", label: "Para Arriendo" },
                { id: "VENTA", label: "Venta" }
              ].map(opt => {
                const active = filtroComercial === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFiltroComercial(opt.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--border-container)",
                      background: active ? "rgba(16, 185, 129, 0.15)" : "var(--bg-input)",
                      color: active ? "var(--color-primary-hover)" : "var(--color-text-muted)",
                      fontSize: "12px",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = "#ff303e";
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
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Combustible Crítico y Toggle Agrupamiento */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSoloCombustibleCritico(!soloCombustibleCritico)}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: soloCombustibleCritico ? "1px solid #ef4444" : "1px solid var(--border-container)",
                background: soloCombustibleCritico ? "rgba(239, 68, 68, 0.15)" : "var(--bg-input)",
                color: soloCombustibleCritico ? "#ef4444" : "var(--color-text-muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: soloCombustibleCritico ? "0 4px 12px rgba(239, 68, 68, 0.15)" : "none",
              }}
              onMouseEnter={e => {
                if (!soloCombustibleCritico) {
                  e.currentTarget.style.borderColor = "#ef4444";
                  e.currentTarget.style.color = "#ef4444";
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                }
              }}
              onMouseLeave={e => {
                if (!soloCombustibleCritico) {
                  e.currentTarget.style.borderColor = "var(--border-container)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                  e.currentTarget.style.background = "var(--bg-input)";
                }
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M11 22v-6M19 14h3M19 18h2.5M19 10H14"/></svg>
              <span>{soloCombustibleCritico ? "Combustible Crítico Activo" : "Solo Combustible Crítico"}</span>
            </button>

            <button
              onClick={() => setAgruparPorProyecto(!agruparPorProyecto)}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: agruparPorProyecto ? "1px solid var(--color-primary)" : "1px solid var(--border-container)",
                background: agruparPorProyecto ? "rgba(16, 185, 129, 0.1)" : "var(--bg-input)",
                color: agruparPorProyecto ? "var(--color-primary-hover)" : "var(--color-text-muted)",
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
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.color = "var(--color-primary-hover)";
                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.05)";
                }
              }}
              onMouseLeave={e => {
                if (!agruparPorProyecto) {
                  e.currentTarget.style.borderColor = "var(--border-container)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                  e.currentTarget.style.background = "var(--bg-input)";
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
              background: "var(--bg-container)", border: `1px solid ${cfg.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
              borderRadius: "10px", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: cfg.bg, display: "flex", alignItems: "center", justifyindex: "center",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Icono size={16} color={cfg.color} />
              </div>
              <div>
                <div style={{ color: "var(--color-text)", fontWeight: 800, fontSize: "20px" }}>
                  {statsCounts[estado]}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{cfg.label}</div>
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
                background: "var(--bg-container)",
                border: "1px solid var(--border-container)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
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
                  borderBottom: "1px solid var(--border-container)",
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
                      background: "rgba(16, 185, 129, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building2 size={16} color="var(--color-primary)" />
                  </div>
                  <div>
                    <div style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "15px" }}>
                      {grupo.nombre}
                    </div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "11px", marginTop: "1px" }}>
                      CC: {grupo.cc}
                    </div>
                  </div>
                </div>

                {/* Badge de cantidad */}
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--color-primary-hover)",
                    border: "1px solid var(--color-primary)",
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
                  <EquipoCard key={eq.id} equipo={eq} onPautaClick={setPautaEquipo} onHistorialClick={setHistorialEquipo} />
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
              <EquipoCard key={eq.id} equipo={eq} onPautaClick={setPautaEquipo} onHistorialClick={setHistorialEquipo} />
            ))}
          </div>
          {equiposFiltrados.length === 0 && (
            <div style={{ color: "#64748b", textAlign: "center", padding: "60px", width: "100%" }}>
              No hay equipos que coincidan con los filtros seleccionados.
            </div>
          )}
        </>
      )}

      {pautaEquipo && (
        <PautaModal
          equipo={pautaEquipo}
          onClose={() => setPautaEquipo(null)}
          onSave={() => {
            setPautaEquipo(null);
            equiposPaginado.refresh(true);
            equiposCompleto.refresh(true);
            showMsg("✅ Pauta actualizada con éxito");
          }}
        />
      )}

      {historialEquipo && (
        <HistorialModal
          equipo={historialEquipo}
          onClose={() => setHistorialEquipo(null)}
        />
      )}
    </>
  );
}
