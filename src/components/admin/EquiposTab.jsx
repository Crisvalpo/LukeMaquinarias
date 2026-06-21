import React, { useState, useRef } from "react";
import { Plus, Pencil, QrCode, Save, X, Camera, Loader2 } from "lucide-react";
import FormRow from "./Shared/FormRow";
import { ESTADO_CONFIG } from "./Shared/constants";
import QrEquipoModal from "./Shared/QrEquipoModal";

const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #1c2e52",
  borderRadius: "8px", color: "white", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ================================================================
// COMPONENTE: Buscador e Paginador (Reutilizables localmente)
// ================================================================
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

// ================================================================
// MODAL DE EDICIÓN COMPLETA DE EQUIPO
// ================================================================
export function EditarEquipoModal({ equipo, proyectos, onClose, onSave }) {
  const [formData, setFormData] = useState({
    codigo_interno: equipo?.codigo_interno || "",
    descripcion_equipo: equipo?.descripcion_equipo || "",
    proveedor: equipo?.proveedor || "EIMISA",
    proyecto_actual_id: equipo?.proyecto_actual_id || "",
    estado_actual: equipo?.estado_actual || "Disponible",
    pauta_preventiva_activa: equipo?.pauta_preventiva_activa || "",
    patente: equipo?.patente || "",
    marca: equipo?.marca || "",
    modelo: equipo?.modelo || "",
    numero_serial: equipo?.numero_serial || "",
    tipo: equipo?.tipo || "",
    categoria: equipo?.categoria || "MAQUINARIA PESADA",
    anio_fabricacion: equipo?.anio_fabricacion !== null && equipo?.anio_fabricacion !== undefined ? equipo.anio_fabricacion.toString() : "",
    seguimiento_completo: equipo?.seguimiento_completo !== false,
    imagen_url: equipo?.imagen_url || "",
    combustible_nivel_porcentaje: equipo?.combustible_nivel_porcentaje !== null && equipo?.combustible_nivel_porcentaje !== undefined ? equipo.combustible_nivel_porcentaje.toString() : "100",
  });
  const [saving, setSaving] = useState(false);
  const [subiendoFondo, setSubiendoFondo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleUploadFondo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFondo(true);
    setErrorMsg("");
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = event.target?.result;
      if (!base64String) {
        setSubiendoFondo(false);
        return;
      }

      try {
        const res = await fetch("/api/equipos/upload-imagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipoId: equipo.id,
            imageBase64: base64String
          })
        });

        const json = await res.json();
        if (json.success && json.imagen_url) {
          setFormData(prev => ({ ...prev, imagen_url: json.imagen_url }));
        } else {
          setErrorMsg("Error al subir imagen: " + (json.error || json.message));
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Ocurrió un error al subir la fotografía.");
      } finally {
        setSubiendoFondo(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.codigo_interno.trim() || !formData.descripcion_equipo.trim()) {
      setErrorMsg("Código Interno y Descripción son requeridos");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const body = {
        id: equipo.id,
        codigo_interno: formData.codigo_interno.trim(),
        descripcion_equipo: formData.descripcion_equipo.trim(),
        proveedor: formData.proveedor.trim(),
        proyecto_actual_id: formData.proyecto_actual_id === "" ? null : formData.proyecto_actual_id,
        estado_actual: formData.estado_actual,
        pauta_preventiva_activa: formData.pauta_preventiva_activa.trim() || null,
        patente: formData.patente.trim() || null,
        marca: formData.marca.trim() || null,
        modelo: formData.modelo.trim() || null,
        numero_serial: formData.numero_serial.trim() || null,
        tipo: formData.tipo.trim() || null,
        categoria: formData.categoria,
        anio_fabricacion: formData.anio_fabricacion.trim() !== "" ? parseInt(formData.anio_fabricacion) : null,
        seguimiento_completo: formData.seguimiento_completo,
        imagen_url: formData.imagen_url.trim() || null,
        combustible_nivel_porcentaje: formData.combustible_nivel_porcentaje.trim() !== "" ? parseFloat(formData.combustible_nivel_porcentaje) : 100,
      };

      const r = await fetch("/api/equipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (json.success) {
        onSave();
      } else {
        setErrorMsg(json.error || json.message || "Error al guardar");
      }
    } catch (e) {
      setErrorMsg(e.message || "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const CATEGORIAS_MAESTRAS = ["GRÚAS", "CAMIONES", "MAQUINARIA PESADA", "MAQUINARIA SEMIPESADA", "VEHÍCULOS MENORES", "EQUIPOS MENORES"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "700px",
        maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Editar Maquinaria / Equipo</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
              Modifique los metadatos técnicos y operacionales del equipo.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#c21a25", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px", fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
          <FormRow label="Código Interno *">
            <input style={inputStyle} value={formData.codigo_interno}
              onChange={e => setFormData(p => ({ ...p, codigo_interno: e.target.value }))} />
          </FormRow>
          <FormRow label="Descripción *">
            <input style={inputStyle} value={formData.descripcion_equipo}
              onChange={e => setFormData(p => ({ ...p, descripcion_equipo: e.target.value }))} />
          </FormRow>
          <FormRow label="Patente">
            <input style={inputStyle} placeholder="Ej: AB-CD-12" value={formData.patente}
              onChange={e => setFormData(p => ({ ...p, patente: e.target.value }))} />
          </FormRow>
          <FormRow label="Marca">
            <input style={inputStyle} placeholder="Ej: Caterpillar" value={formData.marca}
              onChange={e => setFormData(p => ({ ...p, marca: e.target.value }))} />
          </FormRow>
          <FormRow label="Modelo">
            <input style={inputStyle} placeholder="Ej: 320D L" value={formData.modelo}
              onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} />
          </FormRow>
          <FormRow label="Número de Serie / Chasis">
            <input style={inputStyle} placeholder="Ej: CAT0320DL..." value={formData.numero_serial}
              onChange={e => setFormData(p => ({ ...p, numero_serial: e.target.value }))} />
          </FormRow>
          <FormRow label="Tipo de Equipo">
            <input style={inputStyle} placeholder="Ej: Excavadora Oruga" value={formData.tipo}
              onChange={e => setFormData(p => ({ ...p, tipo: e.target.value }))} />
          </FormRow>
          <FormRow label="Categoría Maestra">
            <select style={selectStyle} value={formData.categoria}
              onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))}>
              {CATEGORIAS_MAESTRAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Año Fabricación">
            <input style={inputStyle} type="number" placeholder="Ej: 2018" value={formData.anio_fabricacion}
              onChange={e => setFormData(p => ({ ...p, anio_fabricacion: e.target.value }))} />
          </FormRow>
          <FormRow label="Proveedor">
            <input style={inputStyle} value={formData.proveedor}
              onChange={e => setFormData(p => ({ ...p, proveedor: e.target.value }))} />
          </FormRow>
          <FormRow label="Seguimiento de Horas por Especialidad/Operador">
            <select style={selectStyle} value={formData.seguimiento_completo.toString()}
              onChange={e => setFormData(p => ({ ...p, seguimiento_completo: e.target.value === "true" }))}>
              <option value="true">Sí (Flujo Completo con Operador, Horómetro y Especialidades)</option>
              <option value="false">No (Sin enlace a Operador, ej: Torres de Iluminación)</option>
            </select>
          </FormRow>
          <FormRow label="Proyecto / Obra Asociada">
            <select style={selectStyle} value={formData.proyecto_actual_id}
              onChange={e => setFormData(p => ({ ...p, proyecto_actual_id: e.target.value }))}>
              <option value="">Sin asignar / En Taller</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo_cc} — {p.nombre_proyecto}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Estado Operacional Actual">
            <select style={selectStyle} value={formData.estado_actual}
              onChange={e => setFormData(p => ({ ...p, estado_actual: e.target.value }))}>
              <option value="Equipo Operativo">Operativo</option>
              <option value="Disponible">Disponible (Sin operador)</option>
              <option value="En Colacion">En Colación</option>
              <option value="Detenido por Falla">Detenido por Falla (Taller)</option>
            </select>
          </FormRow>
          <FormRow label="Nivel de Combustible (%)">
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              placeholder="Ej: 80"
              value={formData.combustible_nivel_porcentaje}
              onChange={e => setFormData(p => ({ ...p, combustible_nivel_porcentaje: e.target.value }))}
            />
          </FormRow>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <FormRow label="Pauta Preventiva Activa">
            <textarea
              value={formData.pauta_preventiva_activa}
              onChange={e => setFormData(p => ({ ...p, pauta_preventiva_activa: e.target.value }))}
              placeholder="Instrucciones especiales para el operador al iniciar jornada..."
              style={{
                width: "100%", minHeight: "80px", background: "#0f172a",
                border: "1px solid #1c2e52", borderRadius: "8px",
                color: "white", padding: "12px", fontSize: "13px",
                resize: "vertical", outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </FormRow>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <FormRow label="Fotografía de Fondo del Equipo">
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input
                  style={inputStyle}
                  placeholder="Pegue la URL de la imagen aquí o suba un archivo..."
                  value={formData.imagen_url}
                  onChange={e => setFormData(p => ({ ...p, imagen_url: e.target.value }))}
                />
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleUploadFondo}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoFondo}
                  style={{
                    background: "#2563eb", border: "none", borderRadius: "8px",
                    color: "white", padding: "10px 16px", fontWeight: 600,
                    fontSize: "13px", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: "8px", transition: "background 0.2s"
                  }}
                >
                  {subiendoFondo ? (
                    <>
                      <Loader2 className="spinner animate-spin" size={14} />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={14} />
                      <span>Subir Imagen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {formData.imagen_url && (
              <div style={{ marginTop: "10px", position: "relative", width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", border: "1px solid #1c2e52" }}>
                <img
                  src={formData.imagen_url}
                  alt="Previsualización de fondo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, imagen_url: "" }))}
                  style={{
                    position: "absolute", top: "8px", right: "8px",
                    background: "rgba(239, 68, 68, 0.9)", border: "none",
                    borderRadius: "50%", width: "24px", height: "24px",
                    color: "white", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", fontSize: "12px",
                    fontWeight: 700
                  }}
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>
            )}
          </FormRow>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #1c2e52",
            color: "#94a3b8", borderRadius: "8px", padding: "10px 20px",
            cursor: "pointer", fontSize: "13px", fontWeight: 600,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)", border: "none",
            color: "white", borderRadius: "8px", padding: "10px 24px",
            cursor: "pointer", fontSize: "13px", fontWeight: 700,
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <Save size={14} /> {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PANEL PRINCIPAL DE GESTIÓN DE EQUIPOS
// ================================================================
export default function EquiposTab({ hookProps }) {
  const {
    equiposPaginado,
    equiposCompleto,
    proyectosCompleto,
    formEquipo,
    setFormEquipo,
    botPhone,
    setBotPhone,
    editEquipo,
    setEditEquipo,
    qrEquipo,
    setQrEquipo,
    saving,
    showMsg,
    handleSubmit
  } = hookProps;

  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Equipos</h1>
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
            {showForm ? "Ocultar Formulario" : "Agregar Equipo"}
          </button>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "#121e36", border: "1px solid #1c2e52",
          padding: "6px 12px", borderRadius: "10px",
        }}>
          <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>🤖 Teléfono del Bot:</span>
          <input
            style={{
              background: "#0f172a", border: "1px solid #1c2e52",
              borderRadius: "6px", color: "white", padding: "4px 8px",
              fontSize: "12px", width: "120px", outline: "none",
            }}
            placeholder="569..."
            value={botPhone}
            onChange={e => setBotPhone(e.target.value)}
          />
          <button
            onClick={async () => {
              try {
                const r = await fetch("/api/config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ valor: botPhone }),
                });
                const json = await r.json();
                if (json.success) {
                  showMsg("✅ Teléfono del bot guardado en base de datos");
                } else {
                  showMsg("❌ Error al guardar en base de datos", false);
                }
              } catch (e) {
                showMsg("❌ Error al guardar en base de datos", false);
              }
            }}
            style={{
              background: "#ff303e", border: "none", color: "white",
              borderRadius: "6px", padding: "4px 10px", fontSize: "12px",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Formulario nuevo equipo */}
      {showForm && (
        <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>
              + REGISTRAR NUEVO EQUIPO
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <FormRow label="Código Interno *">
              <input style={inputStyle} placeholder="EIMI00387"
                value={formEquipo.codigo_interno}
                onChange={e => setFormEquipo(p => ({ ...p, codigo_interno: e.target.value }))} />
            </FormRow>
            <FormRow label="Descripción *">
              <input style={inputStyle} placeholder="Liebherr LR 1300"
                value={formEquipo.descripcion_equipo}
                onChange={e => setFormEquipo(p => ({ ...p, descripcion_equipo: e.target.value }))} />
            </FormRow>
            <FormRow label="Proveedor">
              <input style={inputStyle} placeholder="EIMISA"
                value={formEquipo.proveedor}
                onChange={e => setFormEquipo(p => ({ ...p, proveedor: e.target.value }))} />
            </FormRow>
            <FormRow label="Proyecto Actual">
              <select style={selectStyle}
                value={formEquipo.proyecto_actual_id}
                onChange={e => setFormEquipo(p => ({ ...p, proyecto_actual_id: e.target.value }))}>
                <option value="">Sin asignar</option>
                {proyectosCompleto.data.map(o => <option key={o.id} value={o.id}>{o.codigo_cc} — {o.nombre_proyecto}</option>)}
              </select>
            </FormRow>
            <FormRow label="Seguimiento de Horas por Especialidad/Operador">
              <select style={selectStyle}
                value={(formEquipo.seguimiento_completo !== false).toString()}
                onChange={e => setFormEquipo(p => ({ ...p, seguimiento_completo: e.target.value === "true" }))}>
                <option value="true">Sí (Flujo Completo con Operador, Horómetro y Especialidades)</option>
                <option value="false">No (Sin enlace a Operador, ej: Torres de Iluminación)</option>
              </select>
            </FormRow>
          </div>
          <button
            onClick={() => handleSubmit("/api/equipos", formEquipo, () => setFormEquipo({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", proyecto_actual_id: "", seguimiento_completo: true }), () => { equiposPaginado.refresh(); equiposCompleto.refresh(); })}
            disabled={saving}
            style={{
              background: "linear-gradient(135deg, #ff303e, #c21a25)", border: "none",
              color: "white", borderRadius: "8px", padding: "9px 20px",
              cursor: "pointer", fontWeight: 700, fontSize: "13px",
              display: "flex", alignItems: "center", gap: "6px", marginTop: "4px",
            }}
          >
            <Plus size={14} /> {saving ? "Guardando…" : "Registrar Equipo"}
          </button>
        </div>
      )}

      {/* Buscador de Equipos */}
      <Buscador
        value={equiposPaginado.search}
        onChange={e => equiposPaginado.setSearch(e.target.value)}
        placeholder="Buscar equipos por código, descripción, marca, modelo, patente, etc..."
      />

      {/* Tabla equipos */}
      <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1c2e52" }}>
              {["Código", "Descripción", "Proveedor", "Proyecto", "Estado", "Combustible", "Acciones"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equiposPaginado.data.map((eq, i) => {
              const cfg = ESTADO_CONFIG[eq.estado_actual] || ESTADO_CONFIG["Disponible"];
              return (
                <tr key={eq.id} style={{ borderBottom: i < equiposPaginado.data.length - 1 ? "1px solid #121e36" : "none", background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                  <td style={{ padding: "12px 16px", color: "#ff303e", fontWeight: 700, fontSize: "13px" }}>{eq.codigo_interno}</td>
                  <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>{eq.descripcion_equipo}</td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.proveedor}</td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{eq.proyectos?.nombre_proyecto || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {(() => {
                      const nivel = eq.combustible_nivel_porcentaje;
                      if (nivel === undefined || nivel === null) return <span style={{ color: "#475569", fontSize: "12px" }}>—</span>;
                      
                      const esCritico = nivel <= 25;
                      const colorCombustible = nivel >= 50 ? "#22c55e" : nivel > 25 ? "#eab308" : "#ef4444";
                      
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "120px" }}>
                          <div style={{ flex: 1, height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden", border: "1px solid #1c2e52" }}>
                            <div className={esCritico ? "animate-pulse-fuel" : ""} style={{
                              width: `${nivel}%`,
                              height: "100%",
                              background: colorCombustible,
                              boxShadow: esCritico ? `0 0 6px ${colorCombustible}` : "none",
                              transition: "width 0.3s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: esCritico ? "#ef4444" : "#94a3b8" }}>{nivel}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setEditEquipo(eq)}
                      style={{
                        background: "#1e3a5f", border: "1px solid #2563eb",
                        color: "#60a5fa", borderRadius: "6px", padding: "6px 12px",
                        fontSize: "11px", fontWeight: 700, cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: "4px"
                      }}
                    >
                      <Pencil size={11} /> Editar
                    </button>
                    <button
                      onClick={() => setQrEquipo(eq)}
                      style={{
                        background: "#121e36", border: "1px solid #1c2e52",
                        color: "#94a3b8", borderRadius: "6px", padding: "6px 12px",
                        fontSize: "11px", fontWeight: 700, cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: "4px"
                      }}
                    >
                      <QrCode size={11} /> QR
                    </button>
                  </td>
                </tr>
              );
            })}
            {equiposPaginado.data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  No hay equipos registrados o no coinciden con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginador api={equiposPaginado} label="equipos" />
      </div>

      {editEquipo && (
        <EditarEquipoModal
          equipo={editEquipo}
          proyectos={proyectosCompleto.data}
          onClose={() => setEditEquipo(null)}
          onSave={() => {
            setEditEquipo(null);
            equiposPaginado.refresh();
            equiposCompleto.refresh();
            showMsg("✅ Equipo actualizado con éxito");
          }}
        />
      )}

      {qrEquipo && (
        <QrEquipoModal
          equipo={qrEquipo}
          botPhone={botPhone}
          onClose={() => setQrEquipo(null)}
        />
      )}
    </>
  );
}
