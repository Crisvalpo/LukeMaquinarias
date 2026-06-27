import React, { useState } from "react";
import { Plus, Pencil, Save, X, Trash2, MoreVertical } from "lucide-react";
import FormRow from "./Shared/FormRow";
import SearchableSelect from "./Shared/SearchableSelect";

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

function Buscador({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: "16px", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: "12px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)", padding: "10px 12px 10px 38px",
          fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
          transition: "all 0.2s",
        }}
        onFocus={e => {
          e.target.style.borderColor = "var(--color-primary)";
          e.target.style.boxShadow = "0 0 0 2px rgba(16, 185, 129, 0.2)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "var(--border-input)";
          e.target.style.boxShadow = "none";
        }}
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          style={{
            position: "absolute", right: "12px", background: "none", border: "none",
            color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0
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
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px", background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-sidebar)", borderBottomLeftRadius: "var(--border-radius-base)", borderBottomRightRadius: "var(--border-radius-base)",
      fontSize: "13px", color: "var(--color-text-muted)"
    }}>
      <div>
        Mostrando <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{fromRecord}-{toRecord}</span> de <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{api.count}</span> {label}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => api.setPage(p => Math.max(p - 1, 1))}
            disabled={api.page === 1}
            style={{
              background: api.page === 1 ? "rgba(0, 0, 0, 0.05)" : "rgba(16, 185, 129, 0.1)", border: "1px solid " + (api.page === 1 ? "var(--border-container)" : "var(--color-primary)"), color: api.page === 1 ? "var(--color-text-muted)" : "var(--color-primary-hover)",
              borderRadius: "6px", padding: "6px 12px", cursor: api.page === 1 ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "12px", opacity: api.page === 1 ? 0.5 : 1, transition: "all 0.2s"
            }}
          >
            Anterior
          </button>
          <span style={{ color: "var(--color-text)", fontWeight: 600, padding: "0 8px" }}>
            Pág. {api.page} de {totalPages}
          </span>
          <button
            onClick={() => api.setPage(p => Math.min(p + 1, totalPages))}
            disabled={api.page >= totalPages}
            style={{
              background: api.page >= totalPages ? "rgba(0, 0, 0, 0.05)" : "rgba(16, 185, 129, 0.1)", border: "1px solid " + (api.page >= totalPages ? "var(--border-container)" : "var(--color-primary)"), color: api.page >= totalPages ? "var(--color-text-muted)" : "var(--color-primary-hover)",
              borderRadius: "6px", padding: "6px 12px", cursor: api.page >= totalPages ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "12px", opacity: api.page >= totalPages ? 0.5 : 1, transition: "all 0.2s"
            }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

export default function PersonalTab({ hookProps }) {
  const {
    personalPaginado,
    personalCompleto,
    proyectosCompleto,
    formPersonal,
    setFormPersonal,
    editingPersonalId,
    setEditingPersonalId,
    formEditPersonal,
    setFormEditPersonal,
    saving,
    handleSubmit,
    handleGuardarPersonal,
    handleDelete
  } = hookProps;

  const [showForm, setShowForm] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const rolColors = { "Supervisor": "#ff303e", "Jefe de Area": "#c21a25", "Operador": "#2563eb", "Rigger": "#9333ea" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Personal</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
            border: showForm ? "1px solid var(--border-container)" : "none",
            color: "white", borderRadius: "8px", padding: "6px 14px",
            cursor: "pointer", fontWeight: 700, fontSize: "12px",
            display: "flex", alignItems: "center", gap: "6px",
            boxShadow: "none",
            transition: "all 0.2s"
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Ocultar Formulario" : "Agregar Trabajador"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text-muted)" }}>+ REGISTRAR TRABAJADOR</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
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
              <SearchableSelect
                options={[
                  { value: "", label: "Sin asignar" },
                  ...(proyectosCompleto?.data || []).map(o => ({
                    value: o.id,
                    label: `${o.codigo_cc} — ${o.nombre_proyecto}`
                  }))
                ]}
                value={formPersonal.proyecto_actual_id || ""}
                onChange={val => setFormPersonal(p => ({ ...p, proyecto_actual_id: val }))}
              />
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
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
          >
            <Plus size={14} /> {saving ? "Guardando…" : "Registrar Trabajador"}
          </button>
        </div>
      )}

      {/* Buscador de Personal */}
      <Buscador
        value={personalPaginado.search}
        onChange={e => personalPaginado.setSearch(e.target.value)}
        placeholder="Buscar personal por nombre, RUT, WhatsApp o rol..."
      />

      <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: "var(--bg-sidebar)" }}>
              {["Foto", "Nombre", "RUT", "WhatsApp", "Rol", "Proyecto", "Turno / Jornada", "Acciones"].map((h, idx, arr) => (
                <th key={h} style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border-container)",
                  borderTopLeftRadius: idx === 0 ? "var(--border-radius-base)" : "0",
                  borderTopRightRadius: idx === arr.length - 1 ? "var(--border-radius-base)" : "0"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personalPaginado.data.map((p, idx) => {
              const isEditing = editingPersonalId === p.id;
              return (
                <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(16, 185, 129, 0.02)" }}>
                  {isEditing ? (
                    <>
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          placeholder="Foto URL"
                          value={formEditPersonal.foto_url}
                          onChange={e => setFormEditPersonal(prev => ({ ...prev, foto_url: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditPersonal.nombre_completo}
                          onChange={e => setFormEditPersonal(prev => ({ ...prev, nombre_completo: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditPersonal.rut}
                          onChange={e => setFormEditPersonal(prev => ({ ...prev, rut: formatRut(e.target.value) }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditPersonal.whatsapp}
                          onChange={e => setFormEditPersonal(prev => ({ ...prev, whatsapp: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
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
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <SearchableSelect
                          options={[
                            { value: "", label: "Sin asignar" },
                            ...(proyectosCompleto?.data || []).map(o => ({
                              value: o.id,
                              label: `${o.codigo_cc} — ${o.nombre_proyecto}`
                            }))
                          ]}
                          value={formEditPersonal.proyecto_actual_id || ""}
                          onChange={val => setFormEditPersonal(prev => ({ ...prev, proyecto_actual_id: val || null }))}
                          selectStyle={{ padding: "6px 10px", minHeight: "32px" }}
                        />
                      </td>
                      <td style={{ padding: "8px 16px", display: "flex", gap: "4px", borderBottom: "1px solid var(--border-container)" }}>
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
                      <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-container)" }}>
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
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nombre_completo}
                            style={{
                              width: "28px", height: "28px", borderRadius: "50%",
                              objectFit: "cover", border: "1px solid var(--border-container)"
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "28px", height: "28px", borderRadius: "50%",
                            background: "rgba(16, 185, 129, 0.15)", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: "10px",
                            fontWeight: 700, color: "var(--color-primary-hover)", border: "1px solid var(--border-container)"
                          }}>
                            {p.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text)", fontWeight: 600, fontSize: "13px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.nombre_completo}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.rut}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.whatsapp}
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-container)" }}>
                        <span style={{ background: `${rolColors[p.rol]}22`, color: rolColors[p.rol] || "#94a3b8", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                          {p.rol}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.proyectos ? `${p.proyectos.codigo_cc} — ${p.proyectos.nombre_proyecto.slice(0, 35)}${p.proyectos.nombre_proyecto.length > 35 ? "..." : ""}` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px", borderBottom: "1px solid var(--border-container)" }}>
                        {p.turno_tipo} · {p.jornada_tipo}
                      </td>
                      <td style={{ padding: "12px 16px", position: "relative", borderBottom: "1px solid var(--border-container)", zIndex: activeMenuId === p.id ? 10 : "auto" }}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                          style={{
                            background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)",
                            color: "var(--color-text-muted)", borderRadius: "6px", padding: "6px 8px",
                            cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === p.id && (
                          <>
                            <div 
                              style={{ position: "fixed", inset: 0, zIndex: 998 }} 
                              onClick={() => setActiveMenuId(null)} 
                            />
                            <div style={{
                              position: "absolute",
                              right: "16px",
                              top: "40px",
                              background: "var(--bg-container, #1e293b)",
                              border: "1px solid var(--border-container, #334155)",
                              borderRadius: "8px",
                              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                              zIndex: 999,
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              padding: "6px",
                              minWidth: "120px"
                            }}>
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
                                  setActiveMenuId(null);
                                }}
                                style={{
                                  background: "transparent", border: "none",
                                  color: "var(--color-text)", borderRadius: "6px", padding: "8px 12px",
                                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                  textAlign: "left"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <Pencil size={12} color="var(--color-primary)" />
                                <span>Editar</span>
                              </button>
                              <hr style={{ border: "none", borderTop: "1px solid var(--border-container, #334155)", margin: "4px 0" }} />
                              <button
                                onClick={() => { handleDelete("/api/personal", p.id, () => { personalPaginado.refresh(); personalCompleto.refresh(); }); setActiveMenuId(null); }}
                                style={{
                                  background: "transparent", border: "none",
                                  color: "#ef4444", borderRadius: "6px", padding: "8px 12px",
                                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: "8px", width: "100%",
                                  textAlign: "left"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <Trash2 size={12} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {personalPaginado.data.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  No hay trabajadores registrados o no coinciden con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginador api={personalPaginado} label="trabajadores" />
      </div>
    </>
  );
}
