import React, { useState } from "react";
import { Plus, Trash2, X, Tag } from "lucide-react";
import FormRow from "./Shared/FormRow";

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

export default function EspecialidadesTab({ hookProps }) {
  const { especialidades, showMsg, saving, setSaving } = hookProps;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre_oficial: "",
    descripcion: "",
    color: "#3b82f6"
  });

  const COLORES_PREDEFINIDOS = [
    "#3b82f6", // Piping / Azul
    "#10b981", // Estructuras / Verde
    "#f59e0b", // Obras Civiles / Amarillo
    "#ef4444", // Electricidad / Rojo
    "#8b5cf6", // Instrumentación / Morado
    "#ec4899", // Izaje Especial / Rosado
    "#f97316", // Mantenimiento / Naranja
    "#06b6d4", // Cyan
    "#6b7280"  // Gris
  ];

  const handleCrear = async () => {
    if (!form.nombre_oficial.trim()) {
      showMsg("❌ El nombre de la disciplina es obligatorio", false);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/especialidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_oficial: form.nombre_oficial.trim(),
          descripcion: form.descripcion.trim(),
          color: form.color
        })
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Disciplina registrada con éxito");
        setForm({ nombre_oficial: "", descripcion: "", color: "#3b82f6" });
        setShowForm(false);
        especialidades.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateColor = async (id, nuevoColor) => {
    try {
      const r = await fetch("/api/especialidades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, color: nuevoColor })
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Color actualizado");
        especialidades.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta disciplina? Los trabajadores y equipos perderán su asignación de color.")) {
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/especialidades?id=${id}`, {
        method: "DELETE"
      });
      const json = await r.json();
      if (json.success) {
        showMsg("✅ Disciplina eliminada");
        especialidades.refresh();
      } else {
        showMsg(`❌ Error: ${json.error || json.message}`, false);
      }
    } catch (e) {
      showMsg(`❌ ${e.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Disciplinas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
            border: showForm ? "1px solid var(--border-container)" : "none",
            color: "white", borderRadius: "8px", padding: "6px 14px",
            cursor: "pointer", fontWeight: 700, fontSize: "12px",
            display: "flex", alignItems: "center", gap: "6px",
            transition: "all 0.2s"
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Ocultar Formulario" : "Agregar Disciplina"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text-muted)" }}>+ CREAR NUEVA DISCIPLINA / ESPECIALIDAD</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <FormRow label="Nombre Disciplina *">
              <input style={inputStyle} placeholder="Ej: Piping, Instrumentación"
                value={form.nombre_oficial}
                onChange={e => setForm(p => ({ ...p, nombre_oficial: e.target.value }))} />
            </FormRow>
            <FormRow label="Descripción">
              <input style={inputStyle} placeholder="Breve detalle de la especialidad..."
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
            </FormRow>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Color Identificador (para el Plan POD)
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {COLORES_PREDEFINIDOS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    backgroundColor: c, border: form.color === c ? "2px solid var(--color-text)" : "2px solid transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "transform 0.1s"
                  }}
                  title={c}
                />
              ))}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Personalizado:</span>
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  style={{ width: "32px", height: "28px", border: "none", cursor: "pointer", background: "transparent" }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCrear}
            disabled={saving}
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", border: "none", color: "white", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={14} /> {saving ? "Guardando…" : "Registrar Disciplina"}
          </button>
        </div>
      )}

      <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-container)", background: "var(--bg-sidebar)" }}>
              {["Disciplina / Especialidad", "Descripción", "Color Identificador", "Acciones"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(especialidades.data || []).map((esp) => (
              <tr key={esp.id} style={{ borderBottom: "1px solid var(--border-container)" }}>
                <td style={{ padding: "12px 16px", color: "var(--color-text)", fontWeight: 700, fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Tag size={14} style={{ color: esp.color || "#6b7280" }} />
                    {esp.nombre_oficial}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  {esp.descripcion || "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: esp.color || "#6b7280" }} />
                    <input
                      type="color"
                      value={esp.color || "#6b7280"}
                      onChange={e => handleUpdateColor(esp.id, e.target.value)}
                      style={{ border: "none", cursor: "pointer", background: "transparent", width: "24px", height: "20px" }}
                      title="Cambiar color rápido"
                    />
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--color-text-muted)" }}>
                      {esp.color || "#6b7280"}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={() => handleEliminar(esp.id)}
                    style={{
                      background: "transparent", border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444", borderRadius: "6px", padding: "6px 10px",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                      fontSize: "12px", fontWeight: 600, transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {(especialidades.data || []).length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  Cargando disciplinas o no hay registros aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
