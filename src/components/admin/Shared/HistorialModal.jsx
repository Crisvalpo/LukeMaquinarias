import React, { useState, useEffect } from "react";
import { X, Clock, Calendar, User, FileText, CheckCircle2, Coffee, AlertTriangle, RefreshCw } from "lucide-react";

const HITO_COLORS = {
  "Trabajando": { color: "#059669", bg: "rgba(16, 185, 129, 0.12)", icon: CheckCircle2, label: "Trabajando" },
  "Disponible": { color: "#2563eb", bg: "rgba(59, 130, 246, 0.12)", icon: Clock, label: "Disponible" },
  "En Colacion": { color: "#d97706", bg: "rgba(245, 158, 11, 0.12)", icon: Coffee, label: "Colación" },
  "Detenido por Falla": { color: "#dc2626", bg: "rgba(239, 68, 68, 0.12)", icon: AlertTriangle, label: "Detenido por Falla" },
};

const formatTime = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
  } catch (e) {
    return isoString.slice(11, 16);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

export default function HistorialModal({ equipo, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!equipo?.id) return;

    const fetchHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/equipos/historial?id=${equipo.id}`);
        const json = await r.json();
        if (json.success) {
          setData(json.data || []);
        } else {
          setError(json.error || "Error al cargar la data");
        }
      } catch (err) {
        console.error("Error cargando historial de equipo:", err);
        setError("Error de conexión al servidor");
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [equipo?.id]);

  if (!equipo) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex", justifyContent: "center", alignItems: "center",
      padding: "20px"
    }}>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-container {
          animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        className="modal-container"
        style={{
          background: "var(--bg-container)",
          border: "1px solid var(--border-container)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "650px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.08)",
          overflow: "hidden"
        }}
      >
        {/* Header del Modal */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-container)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-sidebar)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
                color: "white", padding: "4px 8px", borderRadius: "4px",
                fontWeight: 800, fontSize: "11px", letterSpacing: "0.5px"
              }}>
                {equipo.codigo_interno}
              </span>
              <span style={{ color: "var(--color-text)", fontWeight: 800, fontSize: "16px" }}>Historial de Uso</span>
            </div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "3px" }}>{equipo.descripcion_equipo}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-container)", border: "1px solid var(--border-container)",
              borderRadius: "50%", width: "32px", height: "32px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-text-muted)", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--color-primary-hover)"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.borderColor = "var(--border-container)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px",
          background: "var(--bg-app)"
        }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-muted)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <RefreshCw className="spin-icon" size={24} style={{ color: "var(--color-primary)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500 }}>Buscando registros en base de datos...</span>
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--color-primary-hover)", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: "50px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
              No se han encontrado registros ni reportes de uso para esta máquina aún.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
              {/* Línea vertical central para el timeline */}
              <div style={{
                position: "absolute", left: "15px", top: "10px", bottom: "10px",
                width: "2px", background: "var(--border-sidebar)", zIndex: 1
              }} />

              {data.map((report) => (
                <div key={report.id} style={{ display: "flex", gap: "16px", position: "relative", zIndex: 2 }}>
                  {/* Icono indicador del Timeline */}
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "var(--bg-container)", border: "2px solid var(--color-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-primary)", flexShrink: 0
                  }}>
                    <Calendar size={13} />
                  </div>

                  {/* Tarjeta del Reporte */}
                  <div style={{
                    flex: 1, background: "var(--bg-container)",
                    border: "1px solid var(--border-container)", borderRadius: "10px",
                    padding: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                  }}>
                    {/* Encabezado del reporte de la fecha */}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", borderBottom: "1px solid var(--border-container)",
                      paddingBottom: "10px", marginBottom: "12px"
                    }}>
                      <div>
                        <div style={{ color: "var(--color-text)", fontWeight: 800, fontSize: "14px" }}>
                          Jornada: {formatDate(report.fecha)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "var(--color-text)" }}>
                          <User size={12} style={{ color: "var(--color-primary)" }} />
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>
                            {report.operador?.nombre_completo || "Operador no asignado"}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--color-primary-hover)", fontSize: "12px", fontWeight: 700 }}>
                          {report.horas_trabajadas ? `${report.horas_trabajadas} hrs trabajadas` : "En proceso / Sin cierre"}
                        </div>
                        {report.petroleo_litros > 0 && (
                          <div style={{ color: "#0284c7", fontSize: "11px", fontWeight: 600, marginTop: "2px" }}>
                            ⛽ {report.petroleo_litros} Lts Combustible
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hitos registrados dentro de este día */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Hitos & Transcripciones del día:
                      </div>

                      {(!report.eventos_jornada || report.eventos_jornada.length === 0) ? (
                        <div style={{ color: "var(--color-text-muted)", fontSize: "11px", fontStyle: "italic", paddingLeft: "4px" }}>
                          Sin hitos intermedios registrados en esta jornada.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "4px" }}>
                          {report.eventos_jornada.map((evt) => {
                            const config = HITO_COLORS[evt.estado_hito] || {
                              color: "var(--color-text-muted)", bg: "rgba(0,0,0,0.02)", icon: Clock, label: evt.estado_hito
                            };
                            const EvtIcon = config.icon;
                            
                            return (
                              <div key={evt.id} style={{
                                padding: "8px 10px", background: "var(--bg-sidebar)",
                                borderRadius: "6px", borderLeft: `3px solid ${config.color}`,
                                display: "flex", flexDirection: "column", gap: "4px"
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <EvtIcon size={11} color={config.color} />
                                    <span style={{ color: config.color, fontSize: "11px", fontWeight: 700 }}>
                                      {config.label}
                                    </span>
                                    {evt.especialidades?.nombre_oficial && (
                                      <span style={{
                                        background: "rgba(16, 185, 129, 0.1)", color: "var(--color-primary-hover)",
                                        padding: "1px 6px", borderRadius: "10px", fontSize: "9px",
                                        border: "1px solid rgba(16, 185, 129, 0.2)"
                                      }}>
                                        {evt.especialidades.nombre_oficial}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ color: "var(--color-text-muted)", fontSize: "11px", fontFamily: "monospace" }}>
                                    {formatTime(evt.hora_evento)} hrs
                                  </span>
                                </div>
                                {evt.nota_transcripcion && (
                                  <p style={{ margin: 0, color: "var(--color-text)", fontSize: "11px", fontStyle: "italic", lineHeight: 1.3 }}>
                                    "{evt.nota_transcripcion}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border-sidebar)",
          display: "flex",
          justifyContent: "flex-end",
          background: "var(--bg-sidebar)"
        }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-container)", border: "1px solid var(--border-container)",
              borderRadius: "8px", padding: "8px 18px", color: "var(--color-text)",
              fontWeight: 700, fontSize: "12px", cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--border-sidebar)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-container)"; }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
