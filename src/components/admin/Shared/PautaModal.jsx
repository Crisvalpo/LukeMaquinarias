import React, { useState } from "react";
import { X, Save } from "lucide-react";

export default function PautaModal({ equipo, onClose, onSave }) {
  const [texto, setTexto] = useState(equipo?.pauta_preventiva_activa || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/equipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: equipo.id, pauta_preventiva_activa: texto }),
      });
      onSave();
    } catch (e) {
      console.error("Error al guardar la pauta:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "500px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>Editar Pauta Preventiva</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
              {equipo?.codigo_interno} — {equipo?.descripcion_equipo}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ej: Revisar presión de neumáticos antes de iniciar. Cambio de filtro hidráulico programado para esta semana."
          style={{
            width: "100%", minHeight: "120px", background: "#0f172a",
            border: "1px solid #1c2e52", borderRadius: "8px",
            color: "white", padding: "12px", fontSize: "13px",
            resize: "vertical", outline: "none", fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
          Esta instrucción se inyectará en el WhatsApp del operador al escanear el QR mañana.
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #1c2e52",
            color: "#94a3b8", borderRadius: "8px", padding: "8px 16px",
            cursor: "pointer", fontSize: "13px",
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "#ff303e", border: "none",
            color: "white", borderRadius: "8px", padding: "8px 20px",
            cursor: "pointer", fontSize: "13px", fontWeight: 700,
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <Save size={14} /> {saving ? "Guardando…" : "Guardar Pauta"}
          </button>
        </div>
      </div>
    </div>
  );
}
