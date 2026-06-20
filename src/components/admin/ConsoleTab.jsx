import React from "react";
import { Search, RefreshCw, Building2 } from "lucide-react";
import { ESTADO_CONFIG } from "./Shared/constants";
import EquipoCard from "./Shared/EquipoCard";
import PautaModal from "./Shared/PautaModal";

export default function ConsoleTab({ hookProps }) {
  const {
    equiposFiltrados,
    equiposCompleto,
    equiposPaginado,
    filtroCategoria,
    setFiltroCategoria,
    filtroEstado,
    setFiltroEstado,
    searchMonitor,
    setSearchMonitor,
    agruparPorProyecto,
    setAgruparPorProyecto,
    statsCounts,
    gruposProyectos,
    pautaEquipo,
    setPautaEquipo,
    showMsg
  } = hookProps;

  const CATEGORIAS_MAESTRAS = ["TODAS", "GRÚAS", "CAMIONES", "MAQUINARIA PESADA", "MAQUINARIA SEMIPESADA", "VEHÍCULOS MENORES", "EQUIPOS MENORES"];

  return (
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
                background: cfg.bg, display: "flex", alignItems: "center", justifyindex: "center",
                display: "flex", alignItems: "center", justifyContent: "center"
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
    </>
  );
}
