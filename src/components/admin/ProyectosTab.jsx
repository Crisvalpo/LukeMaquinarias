import React, { useState } from "react";
import { Plus, Pencil, Save, X } from "lucide-react";
import FormRow from "./Shared/FormRow";

const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #1c2e52",
  borderRadius: "8px", color: "white", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

function Buscador({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: "16px", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: "12px", color: "#64748b", display: "flex", alignItems: "center", pointerEvents: "none" }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: "100%", background: "#0f172a", border: "1px solid #1c2e52",
          borderRadius: "8px", color: "white", padding: "10px 12px 10px 38px",
          fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
          transition: "all 0.2s",
        }}
        onFocus={e => {
          e.target.style.borderColor = "#ff303e";
          e.target.style.boxShadow = "0 0 0 2px rgba(255, 48, 62, 0.2)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "#1c2e52";
          e.target.style.boxShadow = "none";
        }}
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          style={{
            position: "absolute", right: "12px", background: "none", border: "none",
            color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0
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
      padding: "16px", background: "#121e36", borderTop: "1px solid #1c2e52",
      borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px",
      fontSize: "13px", color: "#94a3b8"
    }}>
      <div>
        Mostrando <span style={{ color: "white", fontWeight: 600 }}>{fromRecord}-{toRecord}</span> de <span style={{ color: "white", fontWeight: 600 }}>{api.count}</span> {label}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => api.setPage(p => Math.max(p - 1, 1))}
            disabled={api.page === 1}
            style={{
              background: api.page === 1 ? "rgba(30, 58, 95, 0.4)" : "#1e3a5f",
              border: "1px solid #2563eb", color: api.page === 1 ? "#4b5563" : "#60a5fa",
              borderRadius: "6px", padding: "6px 12px", cursor: api.page === 1 ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "12px", opacity: api.page === 1 ? 0.5 : 1, transition: "all 0.2s"
            }}
          >
            Anterior
          </button>
          <span style={{ color: "white", fontWeight: 600, padding: "0 8px" }}>
            Pág. {api.page} de {totalPages}
          </span>
          <button
            onClick={() => api.setPage(p => Math.min(p + 1, totalPages))}
            disabled={api.page >= totalPages}
            style={{
              background: api.page >= totalPages ? "rgba(30, 58, 95, 0.4)" : "#1e3a5f",
              border: "1px solid #2563eb", color: api.page >= totalPages ? "#4b5563" : "#60a5fa",
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

export default function ProyectosTab({ hookProps }) {
  const {
    proyectosPaginado,
    proyectosCompleto,
    formProyecto,
    setFormProyecto,
    editingProyectoId,
    setEditingProyectoId,
    formEditProyecto,
    setFormEditProyecto,
    saving,
    handleSubmit,
    handleGuardarProyecto
  } = hookProps;

  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Proyectos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? "#1e293b" : "linear-gradient(135deg, #ff303e, #c21a25)",
            border: showForm ? "1px solid #334155" : "none",
            color: "white", borderRadius: "8px", padding: "6px 14px",
            cursor: "pointer", fontWeight: 700, fontSize: "12px",
            display: "flex", alignItems: "center", gap: "6px",
            boxShadow: showForm ? "none" : "0 0 12px rgba(255, 48, 62, 0.3)",
            transition: "all 0.2s"
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Ocultar Formulario" : "Agregar Proyecto"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>+ REGISTRAR NUEVO PROYECTO</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <FormRow label="Nombre Proyecto *">
              <input style={inputStyle} placeholder="Andina Fase 2"
                value={formProyecto.nombre_proyecto}
                onChange={e => setFormProyecto(p => ({ ...p, nombre_proyecto: e.target.value }))} />
            </FormRow>
            <FormRow label="Centro de Costos *">
              <input style={inputStyle} placeholder="CC-ANDINA-01"
                value={formProyecto.codigo_cc}
                onChange={e => setFormProyecto(p => ({ ...p, codigo_cc: e.target.value }))} />
            </FormRow>
            <FormRow label="Ubicación">
              <input style={inputStyle} placeholder="Frente Norte, Sector 3"
                value={formProyecto.ubicacion}
                onChange={e => setFormProyecto(p => ({ ...p, ubicacion: e.target.value }))} />
            </FormRow>
          </div>
          <button
            onClick={() => handleSubmit("/api/proyectos", formProyecto, () => setFormProyecto({ nombre_proyecto: "", codigo_cc: "", ubicacion: "" }), () => { proyectosPaginado.refresh(); proyectosCompleto.refresh(); })}
            disabled={saving}
            style={{ background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
          >
            <Plus size={14} /> {saving ? "Guardando…" : "Registrar Proyecto"}
          </button>
        </div>
      )}

      {/* Buscador de Proyectos */}
      <Buscador
        value={proyectosPaginado.search}
        onChange={e => proyectosPaginado.setSearch(e.target.value)}
        placeholder="Buscar proyectos por nombre, centro de costos o ubicación..."
      />

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
            {proyectosPaginado.data.map((o, idx) => {
              const isEditing = editingProyectoId === o.id;
              return (
                <tr key={o.id} style={{ borderBottom: "1px solid #1c2e52", background: idx % 2 === 0 ? "transparent" : "#0f172a22" }}>
                  {isEditing ? (
                    <>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditProyecto.codigo_cc}
                          onChange={e => setFormEditProyecto(prev => ({ ...prev, codigo_cc: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditProyecto.nombre_proyecto}
                          onChange={e => setFormEditProyecto(prev => ({ ...prev, nombre_proyecto: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          style={{ ...inputStyle, padding: "6px 10px" }}
                          value={formEditProyecto.ubicacion || ""}
                          onChange={e => setFormEditProyecto(prev => ({ ...prev, ubicacion: e.target.value }))}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <select
                          style={{ ...selectStyle, padding: "6px 10px" }}
                          value={formEditProyecto.activa ? "true" : "false"}
                          onChange={e => setFormEditProyecto(prev => ({ ...prev, activa: e.target.value === "true" }))}
                        >
                          <option value="true">Activa</option>
                          <option value="false">Inactiva</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px 16px", display: "flex", gap: "8px" }}>
                        <button
                          onClick={handleGuardarProyecto}
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
                          onClick={() => setEditingProyectoId(null)}
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
                        {o.nombre_proyecto}
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
                            setEditingProyectoId(o.id);
                            setFormEditProyecto({
                              nombre_proyecto: o.nombre_proyecto,
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
            {proyectosPaginado.data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  No hay proyectos registrados o no coinciden con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginador api={proyectosPaginado} label="proyectos" />
      </div>
    </>
  );
}
