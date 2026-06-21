import React, { useState, useEffect } from "react";
import { FileText, List, HardHat, Users, ChevronDown, ChevronUp, RefreshCw, Search } from "lucide-react";

function ExpandedReportList({ type, id }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/reportes", window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      if (type === "equipo") {
        url.searchParams.set("equipo_id", id);
      } else {
        url.searchParams.set("operador_id", id);
      }
      const r = await fetch(url.toString());
      const json = await r.json();
      setReports(json.data || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error("Error al cargar reportes agrupados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, type, id]);

  if (loading && reports.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <RefreshCw className="spin-icon" size={16} />
          <span>Cargando historial de reportes...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-app)",
      border: "1px solid var(--border-container)",
      padding: "20px",
      borderRadius: "var(--border-radius-base)",
      margin: "8px 0 16px",
      boxShadow: "none"
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {reports.length === 0 ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "10px 0", textAlign: "center" }}>
          No se encontraron reportes registrados para este {type === "equipo" ? "equipo" : "operador"}.
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-container)" }}>
                {["Fecha", type === "equipo" ? "Operador" : "Equipo", "Hr. Inicio", "Hr. Final", "Horas", "PDF"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < reports.length - 1 ? "1px solid var(--border-container)" : "none" }}>
                  <td style={{ padding: "10px 14px", color: "var(--color-text)", fontSize: "12px" }}>{r.fecha}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text)", fontSize: "12px" }}>
                    {type === "equipo" ? (
                      r.personal?.nombre_completo || "—"
                    ) : (
                      <div>
                        <span style={{ color: "var(--color-primary-hover)", fontWeight: 700 }}>{r.equipos?.codigo_interno}</span>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px", marginLeft: "6px" }}>{r.equipos?.descripcion_equipo}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-muted)", fontSize: "12px" }}>{r.horometro_inicio?.toLocaleString("es-CL")}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-muted)", fontSize: "12px" }}>{r.horometro_final?.toLocaleString("es-CL") || "—"}</td>
                  <td style={{ padding: "10px 14px", color: r.horas_trabajadas ? "#16a34a" : "#64748b", fontWeight: 700, fontSize: "12px" }}>
                    {r.horas_trabajadas ? `${r.horas_trabajadas} hrs` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--color-primary)", color: "var(--color-primary-hover)", borderRadius: "6px", padding: "4px 8px",
                          fontSize: "11px", fontWeight: 700, textDecoration: "none",
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                        onMouseLeave={e => e.currentTarget.style.background = "#1e3a5f"}
                      >
                        <FileText size={10} /> PDF
                      </a>
                    ) : (
                      <span style={{ color: "#334155", fontSize: "11px" }}>Sin PDF</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mini Paginador Local */}
          {total > limit && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-sidebar)"
            }}>
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  background: page === 1 ? "rgba(30, 41, 59, 0.5)" : "#ff303e",
                  color: page === 1 ? "#475569" : "white",
                  border: "none", padding: "6px 12px", borderRadius: "6px",
                  fontSize: "12px", fontWeight: 700, cursor: (page === 1 || loading) ? "not-allowed" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                Anterior
              </button>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Pág. <strong>{page}</strong> de <strong>{Math.ceil(total / limit)}</strong> ({total} reportes)
              </span>
              <button
                disabled={page * limit >= total || loading}
                onClick={() => setPage(p => p + 1)}
                style={{
                  background: page * limit >= total ? "rgba(30, 41, 59, 0.5)" : "#ff303e",
                  color: page * limit >= total ? "#475569" : "white",
                  border: "none", padding: "6px 12px", borderRadius: "6px",
                  fontSize: "12px", fontWeight: 700, cursor: (page * limit >= total || loading) ? "not-allowed" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportesTab({ hookProps }) {
  const { reportes } = hookProps;
  const [viewMode, setViewMode] = useState("lista"); // 'lista', 'equipo', 'usuario'
  
  // Estados para búsqueda local en agrupaciones
  const [eqSearch, setEqSearch] = useState("");
  const [expandedEqId, setExpandedEqId] = useState(null);
  
  const [opSearch, setOpSearch] = useState("");
  const [expandedOpId, setExpandedOpId] = useState(null);

  // Filtrar Equipos localmente para la agrupación
  const filteredEquipos = (hookProps.equiposCompleto?.data || []).filter(eq =>
    (eq.codigo_interno || "").toLowerCase().includes(eqSearch.toLowerCase()) ||
    (eq.descripcion_equipo || "").toLowerCase().includes(eqSearch.toLowerCase())
  );

  // Filtrar Operadores localmente para la agrupación
  const filteredOperadores = (hookProps.personalCompleto?.data || []).filter(op =>
    (op.nombre_completo || "").toLowerCase().includes(opSearch.toLowerCase()) ||
    (op.rut || "").toLowerCase().includes(opSearch.toLowerCase()) ||
    (op.rol || "").toLowerCase().includes(opSearch.toLowerCase())
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Historial de Reportes</h1>
        
        {/* Selector de modo de vista */}
        <div style={{
          display: "flex",
          background: "var(--bg-sidebar)",
          border: "1px solid var(--border-sidebar)",
          padding: "3px",
          borderRadius: "10px",
          gap: "4px"
        }}>
          {[
            { id: "lista", label: "Lista Plana", icon: List },
            { id: "equipo", label: "Por Equipo", icon: HardHat },
            { id: "usuario", label: "Por Operador", icon: Users },
          ].map(m => {
            const Icon = m.icon;
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "8px",
                  border: "none",
                  background: active ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" : "transparent",
                  color: active ? "white" : "var(--color-text-muted)",
                  fontWeight: 700, fontSize: "12px",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <Icon size={13} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: LISTA PLANA (CON FILTROS Y PAGINACIÓN SERVIDOR) */}
      {/* ======================================================== */}
      {viewMode === "lista" && (
        <>
          {/* Panel de Filtros */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "16px", padding: "16px 20px",
            background: "var(--bg-container)",
            border: "1px solid var(--border-container)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", borderRadius: "12px",
            marginBottom: "20px", alignItems: "flex-end"
          }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Filtrar por Equipo
              </label>
              <select
                value={reportes.equipoId}
                onChange={e => reportes.setEquipoId(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--color-input-text)", fontSize: "13px",
                  outline: "none"
                }}
              >
                <option value="">Todos los Equipos</option>
                {(hookProps.equiposCompleto?.data || []).map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.codigo_interno} - {eq.descripcion_equipo}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Filtrar por Operador
              </label>
              <select
                value={reportes.operadorId}
                onChange={e => reportes.setOperadorId(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--color-input-text)", fontSize: "13px",
                  outline: "none"
                }}
              >
                <option value="">Todos los Operadores</option>
                {(hookProps.personalCompleto?.data || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre_completo} ({p.rol})</option>
                ))}
              </select>
            </div>

            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Fecha
              </label>
              <input
                type="date"
                value={reportes.fecha}
                onChange={e => reportes.setFecha(e.target.value)}
                style={{
                  width: "100%", padding: "7px 12px", borderRadius: "8px",
                  background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--color-input-text)", fontSize: "13px",
                  outline: "none"
                }}
              />
            </div>

            {(reportes.equipoId || reportes.operadorId || reportes.fecha) && (
              <button
                onClick={() => {
                  reportes.setEquipoId("");
                  reportes.setOperadorId("");
                  reportes.setFecha("");
                }}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444",
                  color: "#f87171", fontWeight: 700, fontSize: "12px",
                  cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Tabla de Reportes */}
          <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden", boxShadow: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-container)" }}>
                  {["Fecha", "Equipo", "Operador", "Hr. Inicio", "Hr. Final", "Horas", "PDF"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportes.loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <RefreshCw className="spin-icon" size={16} />
                        <span>Cargando listado de reportes...</span>
                      </div>
                    </td>
                  </tr>
                ) : reportes.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                      No se encontraron reportes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  reportes.data.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: i < reportes.data.length - 1 ? "1px solid var(--border-container)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(16, 185, 129, 0.02)" }}>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px" }}>{r.fecha}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ color: "#ff303e", fontWeight: 700, fontSize: "12px" }}>{r.equipos?.codigo_interno}</div>
                        <div style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{r.equipos?.descripcion_equipo?.slice(0, 30)}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text)", fontSize: "13px" }}>{r.personal?.nombre_completo}</td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px" }}>{r.horometro_inicio?.toLocaleString("es-CL")}</td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px" }}>{r.horometro_final?.toLocaleString("es-CL") || "—"}</td>
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
                              background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--color-primary)", color: "var(--color-primary-hover)", borderRadius: "6px", padding: "6px 12px",
                              fontSize: "11px", fontWeight: 700, textDecoration: "none",
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                            onMouseLeave={e => e.currentTarget.style.background = "#1e3a5f"}
                          >
                            <FileText size={10} /> Descargar
                          </a>
                        ) : (
                          <span style={{ color: "#1c2e52", fontSize: "12px" }}>Sin PDF</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Paginador Servidor */}
            {!reportes.loading && reportes.count > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 20px", borderTop: "1px solid var(--border-sidebar)", background: "var(--bg-sidebar)"
              }}>
                <button
                  disabled={reportes.page === 1 || reportes.loading}
                  onClick={() => reportes.setPage(p => Math.max(1, p - 1))}
                  style={{
                    background: reportes.page === 1 ? "rgba(0,0,0,0.05)" : "var(--color-primary)",
                    color: reportes.page === 1 ? "var(--color-text-muted)" : "white",
                    border: "none", padding: "8px 16px", borderRadius: "8px",
                    fontSize: "12px", fontWeight: 700, cursor: (reportes.page === 1 || reportes.loading) ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Página <strong style={{ color: "var(--color-text)" }}>{reportes.page}</strong> de{" "}
                  <strong style={{ color: "var(--color-text)" }}>{Math.ceil(reportes.count / reportes.limit) || 1}</strong>{" "}
                  (Total: {reportes.count} reportes)
                </span>
                <button
                  disabled={reportes.page * reportes.limit >= reportes.count || reportes.loading}
                  onClick={() => reportes.setPage(p => p + 1)}
                  style={{
                    background: reportes.page * reportes.limit >= reportes.count ? "rgba(0,0,0,0.05)" : "var(--color-primary)",
                    color: reportes.page * reportes.limit >= reportes.count ? "var(--color-text-muted)" : "white",
                    border: "none", padding: "8px 16px", borderRadius: "8px",
                    fontSize: "12px", fontWeight: 700, cursor: (reportes.page * reportes.limit >= reportes.count || reportes.loading) ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: AGRUPADO POR EQUIPO (CON LAZY LOADING)          */}
      {/* ======================================================== */}
      {viewMode === "equipo" && (
        <>
          {/* Buscador de equipo */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", maxWidth: "450px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar equipo por código o descripción..."
                value={eqSearch}
                onChange={e => setEqSearch(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px 10px 38px", borderRadius: "8px",
                  background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--color-input-text)", fontSize: "13px",
                  outline: "none"
                }}
              />
              <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            </div>
          </div>

          {/* Listado de equipos */}
          <div>
            {filteredEquipos.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No se encontraron equipos que coincidan con la búsqueda.
              </div>
            ) : (
              filteredEquipos.map(eq => {
                const isExpanded = expandedEqId === eq.id;
                return (
                  <div key={eq.id} style={{
                    background: "var(--bg-container)", border: "1px solid var(--border-container)",
                    borderRadius: "var(--border-radius-base)", marginBottom: "10px", overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
                  }}>
                    <div
                      onClick={() => setExpandedEqId(isExpanded ? null : eq.id)}
                      style={{
                        padding: "14px 18px", display: "flex", justifyContent: "space-between",
                        alignItems: "center", cursor: "pointer", background: isExpanded ? "var(--bg-sidebar)" : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{
                          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
                          color: "white", padding: "6px 12px", borderRadius: "6px",
                          fontWeight: 800, fontSize: "13px", letterSpacing: "0.5px"
                        }}>
                          {eq.codigo_interno}
                        </div>
                        <div>
                          <div style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "14px" }}>{eq.descripcion_equipo}</div>
                          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                            Proveedor: <span style={{ color: "var(--color-text)" }}>{eq.proveedor}</span> | Estado actual: <span style={{ color: eq.estado_actual === "Disponible" ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{eq.estado_actual}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {isExpanded ? <ChevronUp size={18} style={{ color: "#60a5fa" }} /> : <ChevronDown size={18} style={{ color: "#64748b" }} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "18px", background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-sidebar)" }}>
                        <ExpandedReportList type="equipo" id={eq.id} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: AGRUPADO POR OPERADOR (CON LAZY LOADING)         */}
      {/* ======================================================== */}
      {viewMode === "usuario" && (
        <>
          {/* Buscador de operadores */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", maxWidth: "450px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar por nombre, RUT o rol..."
                value={opSearch}
                onChange={e => setOpSearch(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px 10px 38px", borderRadius: "8px",
                  background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--color-input-text)", fontSize: "13px",
                  outline: "none"
                }}
              />
              <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            </div>
          </div>

          {/* Listado de operadores */}
          <div>
            {filteredOperadores.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No se encontró personal registrado que coincida con la búsqueda.
              </div>
            ) : (
              filteredOperadores.map(op => {
                const isExpanded = expandedOpId === op.id;
                return (
                  <div key={op.id} style={{
                    background: "var(--bg-container)", border: "1px solid var(--border-container)",
                    borderRadius: "var(--border-radius-base)", marginBottom: "10px", overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
                  }}>
                    <div
                      onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                      style={{
                        padding: "14px 18px", display: "flex", justifyContent: "space-between",
                        alignItems: "center", cursor: "pointer", background: isExpanded ? "var(--bg-sidebar)" : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "var(--color-primary-hover)", padding: "6px 12px", borderRadius: "6px",
                          fontWeight: 700, fontSize: "12px", border: "1px solid var(--color-primary)"
                        }}>
                          {op.rol}
                        </div>
                        <div>
                          <div style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "14px" }}>{op.nombre_completo}</div>
                          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                            RUT: <span style={{ color: "var(--color-text)" }}>{op.rut}</span> | WhatsApp: <span style={{ color: "var(--color-text)" }}>{op.whatsapp}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {isExpanded ? <ChevronUp size={18} style={{ color: "#60a5fa" }} /> : <ChevronDown size={18} style={{ color: "#64748b" }} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "18px", background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-sidebar)" }}>
                        <ExpandedReportList type="operador" id={op.id} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </>
  );
}
