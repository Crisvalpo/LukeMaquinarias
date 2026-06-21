import React from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

function formatRut(value) {
  let clean = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean;
  let dv = clean.slice(-1);
  let cuerpo = clean.slice(0, -1);
  let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
}

export default function RegistrosTab({ hookProps }) {
  const {
    registros,
    editRegistros,
    setEditRegistros,
    proyectosCompleto,
    saving,
    handleAprobarRegistro,
    rechazoId,
    setRechazoId,
    notaRechazo,
    setNotaRechazo,
    handleRechazarRegistro
  } = hookProps;

  return (
    <>
      <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Solicitudes de Registro por WhatsApp</h1>

      {/* Solicitudes Pendientes */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#cbd5e1" }}>
          Solicitudes Pendientes de Aprobación
        </h3>
        <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-container)", background: "var(--bg-sidebar)" }}>
                {["WhatsApp", "Nombre en WhatsApp", "Rol Solicitado", "Ingresar RUT *", "Proyecto", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
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
        <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-container)", background: "#0f172a22" }}>
                {["Fecha", "WhatsApp", "Nombre", "Rol", "Estado", "Detalle"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.data.filter(r => r.estado !== "pendiente").map((r, idx) => {
                const isAprobado = r.estado === "aprobado";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #121e36", background: idx % 2 === 0 ? "transparent" : "rgba(16, 185, 129, 0.02)" }}>
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
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "12px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* Rechazo Modal */}
      {rechazoId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }}>
          <div style={{
            background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", padding: "24px", width: "100%", maxWidth: "450px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>Rechazar Solicitud de Registro</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "2px" }}>
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
    </>
  );
}
