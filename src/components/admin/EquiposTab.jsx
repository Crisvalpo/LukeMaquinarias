import React, { useState, useRef } from "react";
import { Plus, Pencil, QrCode, Save, X, Camera, Loader2, Trash2, MoreVertical } from "lucide-react";
import FormRow from "./Shared/FormRow";
import { ESTADO_CONFIG } from "./Shared/constants";
import QrEquipoModal from "./Shared/QrEquipoModal";
import SearchableSelect from "./Shared/SearchableSelect";

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)", padding: "9px 12px",
  fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ================================================================
// COMPONENTE: Buscador e Paginador (Reutilizables localmente)
// ================================================================
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
    clasificacion_comercial: equipo?.clasificacion_comercial || "OPERATIVO - EN USO",
    arriendo_cliente: equipo?.arriendo_cliente || "",
    arriendo_fecha_inicio: equipo?.arriendo_fecha_inicio || "",
    arriendo_fecha_fin: equipo?.arriendo_fecha_fin || "",
    capacidad_estanque_litros: equipo?.capacidad_estanque_litros !== null && equipo?.capacidad_estanque_litros !== undefined ? equipo.capacidad_estanque_litros.toString() : "",
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
        clasificacion_comercial: formData.clasificacion_comercial,
        arriendo_cliente: formData.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO" ? (formData.arriendo_cliente.trim() || null) : null,
        arriendo_fecha_inicio: formData.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO" ? (formData.arriendo_fecha_inicio || null) : null,
        arriendo_fecha_fin: formData.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO" ? (formData.arriendo_fecha_fin || null) : null,
        capacidad_estanque_litros: formData.capacidad_estanque_litros.trim() !== "" ? parseInt(formData.capacidad_estanque_litros) : null,
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "var(--bg-container)", border: "1px solid var(--border-container)",
        borderRadius: "var(--border-radius-base)", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", padding: "24px", width: "100%", maxWidth: "700px",
        maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ color: "var(--color-text)", fontWeight: 800, fontSize: "18px" }}>Editar Maquinaria / Equipo</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "2px" }}>
              Modifique los metadatos técnicos y operacionales del equipo.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
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
            <SearchableSelect
              options={[
                { value: "", label: "Sin asignar / En Taller" },
                ...(proyectos || []).map(p => ({
                  value: p.id,
                  label: `${p.codigo_cc} — ${p.nombre_proyecto}`
                }))
              ]}
              value={formData.proyecto_actual_id || ""}
              onChange={val => setFormData(p => ({ ...p, proyecto_actual_id: val }))}
            />
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
          <FormRow label="Clasificación Comercial">
            <select style={selectStyle} value={formData.clasificacion_comercial}
              onChange={e => setFormData(p => ({ ...p, clasificacion_comercial: e.target.value }))}>
              <option value="OPERATIVO - EN USO">Operativo - En Uso</option>
              <option value="DISPONIBLE PARA ARRIENDO">Disponible para Arriendo</option>
              <option value="VENTA">Venta</option>
              <option value="EN PREPARACION OBRA">En Preparación Obra</option>
              <option value="FUERA DE SERVICIO - REPARACION - MANTENCION">Fuera de Servicio - Reparación / Mantención</option>
              <option value="EN IMPORTACION">En Importación</option>
            </select>
          </FormRow>
          <FormRow label="Capacidad Estanque (Litros)">
            <input style={inputStyle} type="number" placeholder="Ej: 150, 200, 350..."
              value={formData.capacidad_estanque_litros || ""}
              onChange={e => setFormData(p => ({ ...p, capacidad_estanque_litros: e.target.value }))} />
          </FormRow>
          {formData.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO" && (
            <>
              <FormRow label="Cliente / Obra de Arriendo">
                <input
                  style={inputStyle}
                  placeholder="Ej: Constructora Alfa S.A."
                  value={formData.arriendo_cliente}
                  onChange={e => setFormData(p => ({ ...p, arriendo_cliente: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Fecha Inicio Arriendo">
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.arriendo_fecha_inicio}
                  onChange={e => setFormData(p => ({ ...p, arriendo_fecha_inicio: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Fecha Fin Arriendo">
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.arriendo_fecha_fin}
                  onChange={e => setFormData(p => ({ ...p, arriendo_fecha_fin: e.target.value }))}
                />
              </FormRow>
            </>
          )}
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
                width: "100%", minHeight: "80px", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: "var(--border-radius-sm)", color: "var(--color-input-text)", padding: "12px", fontSize: "13px",
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
            color: "var(--color-text-muted)", borderRadius: "8px", padding: "10px 20px",
            cursor: "pointer", fontSize: "13px", fontWeight: 600,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)", border: "none",
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
    handleSubmit,
    handleDelete
  } = hookProps;

  const [showForm, setShowForm] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const equiposAgrupados = React.useMemo(() => {
    const groups = {};
    (equiposPaginado.data || []).forEach(eq => {
      const pName = eq.proyectos?.nombre_proyecto || "Sin Asignar / En Patio";
      if (!groups[pName]) groups[pName] = [];
      groups[pName].push(eq);
    });
    return groups;
  }, [equiposPaginado.data]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Gestión de Equipos</h1>
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
          {showForm ? "Ocultar Formulario" : "Agregar Equipo"}
        </button>
      </div>

      {/* Formulario nuevo equipo */}
      {showForm && (
        <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", padding: "20px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text-muted)" }}>
              + REGISTRAR NUEVO EQUIPO
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
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
              <SearchableSelect
                options={[
                  { value: "", label: "Sin asignar" },
                  ...(proyectosCompleto?.data || []).map(o => ({
                    value: o.id,
                    label: `${o.codigo_cc} — ${o.nombre_proyecto}`
                  }))
                ]}
                value={formEquipo.proyecto_actual_id || ""}
                onChange={val => setFormEquipo(p => ({ ...p, proyecto_actual_id: val }))}
              />
            </FormRow>
            <FormRow label="Seguimiento de Horas por Especialidad/Operador">
              <select style={selectStyle}
                value={(formEquipo.seguimiento_completo !== false).toString()}
                onChange={e => setFormEquipo(p => ({ ...p, seguimiento_completo: e.target.value === "true" }))}>
                <option value="true">Sí (Flujo Completo con Operador, Horómetro y Especialidades)</option>
                <option value="false">No (Sin enlace a Operador, ej: Torres de Iluminación)</option>
              </select>
            </FormRow>
            <FormRow label="Clasificación Comercial">
              <select style={selectStyle}
                value={formEquipo.clasificacion_comercial || "OPERATIVO - EN USO"}
                onChange={e => setFormEquipo(p => ({ ...p, clasificacion_comercial: e.target.value }))}>
                <option value="OPERATIVO - EN USO">Operativo - En Uso</option>
                <option value="DISPONIBLE PARA ARRIENDO">Disponible para Arriendo</option>
                <option value="VENTA">Venta</option>
                <option value="EN PREPARACION OBRA">En Preparación Obra</option>
                <option value="FUERA DE SERVICIO - REPARACION - MANTENCION">Fuera de Servicio - Reparación / Mantención</option>
                <option value="EN IMPORTACION">En Importación</option>
              </select>
            </FormRow>
            <FormRow label="Capacidad Estanque (Litros)">
              <input style={inputStyle} type="number" placeholder="Ej: 150, 200, 350..."
                value={formEquipo.capacidad_estanque_litros || ""}
                onChange={e => setFormEquipo(p => ({ ...p, capacidad_estanque_litros: e.target.value }))} />
            </FormRow>
            {formEquipo.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO" && (
              <>
                <FormRow label="Cliente / Obra de Arriendo">
                  <input style={inputStyle} placeholder="Ej: Constructora Alfa S.A."
                    value={formEquipo.arriendo_cliente || ""}
                    onChange={e => setFormEquipo(p => ({ ...p, arriendo_cliente: e.target.value }))} />
                </FormRow>
                <FormRow label="Fecha Inicio Arriendo">
                  <input type="date" style={inputStyle}
                    value={formEquipo.arriendo_fecha_inicio || ""}
                    onChange={e => setFormEquipo(p => ({ ...p, arriendo_fecha_inicio: e.target.value }))} />
                </FormRow>
                <FormRow label="Fecha Fin Arriendo">
                  <input type="date" style={inputStyle}
                    value={formEquipo.arriendo_fecha_fin || ""}
                    onChange={e => setFormEquipo(p => ({ ...p, arriendo_fecha_fin: e.target.value }))} />
                </FormRow>
              </>
            )}
          </div>
          <button
            onClick={() => handleSubmit("/api/equipos", formEquipo, () => setFormEquipo({ codigo_interno: "", descripcion_equipo: "", proveedor: "EIMISA", proyecto_actual_id: "", seguimiento_completo: true, clasificacion_comercial: "OPERATIVO - EN USO", arriendo_cliente: "", arriendo_fecha_inicio: "", arriendo_fecha_fin: "", capacidad_estanque_litros: "" }), () => { equiposPaginado.refresh(); equiposCompleto.refresh(); })}
            disabled={saving}
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", border: "none",
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
      <div style={{ background: "var(--bg-container)", border: "1px solid var(--border-container)", borderRadius: "var(--border-radius-base)", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-container)", background: "var(--bg-sidebar)" }}>
              {["Código", "Descripción", "Estado", "Clasif. Comercial", "Combustible", "Acciones"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(equiposAgrupados).map(([proyecto, items]) => (
              <React.Fragment key={proyecto}>
                <tr style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border-container)" }}>
                  <td colSpan={6} style={{ padding: "8px 16px", color: "var(--color-primary-hover)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    📍 {proyecto} ({items.length} {items.length === 1 ? "equipo" : "equipos"})
                  </td>
                </tr>
                {items.map((eq, i) => {
                  const cfg = ESTADO_CONFIG[eq.estado_actual] || ESTADO_CONFIG["Disponible"];
                  return (
                    <tr key={eq.id} style={{ borderBottom: "1px solid var(--border-container)", background: i % 2 === 0 ? "transparent" : "rgba(16, 185, 129, 0.02)" }}>
                      <td style={{ padding: "12px 16px", color: "#ff303e", fontWeight: 700, fontSize: "13px" }}>{eq.codigo_interno}</td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text)", fontSize: "13px" }}>{eq.descripcion_equipo}</td>
                      <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {(() => {
                      const esArriendo = eq.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO";
                      const estaArrendado = esArriendo && eq.arriendo_cliente && eq.arriendo_cliente.trim() !== "";
                      
                      let bg = "var(--bg-sidebar)";
                      let color = "var(--color-text-muted)";
                      let border = "1px solid var(--border-sidebar)";
                      let label = eq.clasificacion_comercial || "OPERATIVO - EN USO";

                      if (eq.clasificacion_comercial === "VENTA") {
                        bg = "rgba(59, 130, 246, 0.12)";
                        color = "#2563eb";
                        border = "1px solid rgba(59, 130, 246, 0.25)";
                        label = "💲 VENTA";
                      } else if (esArriendo) {
                        if (estaArrendado) {
                          bg = "rgba(249, 115, 22, 0.12)";
                          color = "#ea580c";
                          border = "1px solid rgba(249, 115, 22, 0.25)";
                          label = "🤝 ARRENDADO";
                        } else {
                          bg = "rgba(16, 185, 129, 0.12)";
                          color = "#059669";
                          border = "1px solid rgba(16, 185, 129, 0.25)";
                          label = "🔑 EN PATIO";
                        }
                      } else if (eq.clasificacion_comercial === "OPERATIVO - EN USO") {
                        bg = "rgba(16, 185, 129, 0.12)";
                        color = "#059669";
                        border = "1px solid rgba(16, 185, 129, 0.25)";
                        label = "👷 EN USO";
                      } else if (eq.clasificacion_comercial === "EN PREPARACION OBRA") {
                        bg = "rgba(217, 119, 6, 0.12)";
                        color = "#d97706";
                        border = "1px solid rgba(217, 119, 6, 0.25)";
                        label = "⚙️ PREPARACIÓN";
                      } else if (eq.clasificacion_comercial === "FUERA DE SERVICIO - REPARACION - MANTENCION") {
                        bg = "rgba(194, 26, 37, 0.12)";
                        color = "#c21a25";
                        border = "1px solid rgba(194, 26, 37, 0.25)";
                        label = "🔧 MANTENCION";
                      } else if (eq.clasificacion_comercial === "EN IMPORTACION") {
                        bg = "rgba(99, 102, 241, 0.12)";
                        color = "#4f46e5";
                        border = "1px solid rgba(99, 102, 241, 0.25)";
                        label = "🚢 IMPORTACIÓN";
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>
                            <span style={{
                              background: bg,
                              color: color,
                              border: border,
                              borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: 700,
                              display: "inline-block"
                            }}>
                              {label}
                            </span>
                          </div>
                          {estaArrendado && (
                            <div style={{ fontSize: "11px", color: "var(--color-text)", lineHeight: 1.2 }}>
                              <span style={{ color: "var(--color-text-muted)" }}>Cliente: </span>{eq.arriendo_cliente}
                              {(eq.arriendo_fecha_inicio || eq.arriendo_fecha_fin) && (
                                <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                  {(() => {
                                    const fmt = (d) => {
                                      if (!d) return "—";
                                      const p = d.split("-");
                                      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
                                    };
                                    return `📅 ${fmt(eq.arriendo_fecha_inicio)} al ${fmt(eq.arriendo_fecha_fin)}`;
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {(() => {
                      const nivel = eq.combustible_nivel_porcentaje;
                      if (nivel === undefined || nivel === null) return <span style={{ color: "#475569", fontSize: "12px" }}>—</span>;
                      
                      const esCritico = nivel <= 25;
                      const colorCombustible = nivel >= 50 ? "#22c55e" : nivel > 25 ? "#eab308" : "#ef4444";
                      
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "120px" }}>
                          <div style={{ flex: 1, height: "6px", background: "var(--bg-input)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--border-input)" }}>
                            <div className={esCritico ? "animate-pulse-fuel" : ""} style={{
                              width: `${nivel}%`,
                              height: "100%",
                              background: colorCombustible,
                              boxShadow: esCritico ? `0 0 6px ${colorCombustible}` : "none",
                              transition: "width 0.3s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: esCritico ? "#ef4444" : "var(--color-text-muted)" }}>{nivel}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "12px 16px", position: "relative" }}>
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === eq.id ? null : eq.id)}
                      style={{
                        background: "var(--bg-sidebar)", border: "1px solid var(--border-sidebar)",
                        color: "var(--color-text-muted)", borderRadius: "6px", padding: "6px 8px",
                        cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuId === eq.id && (
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
                            onClick={() => { setEditEquipo(eq); setActiveMenuId(null); }}
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
                          <button
                            onClick={() => { setQrEquipo(eq); setActiveMenuId(null); }}
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
                            <QrCode size={12} />
                            <span>Código QR</span>
                          </button>
                          <hr style={{ border: "none", borderTop: "1px solid var(--border-container, #334155)", margin: "4px 0" }} />
                          <button
                            onClick={() => { handleDelete("/api/equipos", eq.id, () => { equiposPaginado.refresh(); equiposCompleto.refresh(); }); setActiveMenuId(null); }}
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
                </tr>
              );
            })}
          </React.Fragment>
        ))}
            {equiposPaginado.data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
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
