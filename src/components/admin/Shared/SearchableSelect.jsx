import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export default function SearchableSelect({ options, value, onChange, placeholder = "Seleccionar...", style, selectStyle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");
  };

  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      {/* Botón / Input disparador */}
      <div
        onClick={handleToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-input, #090f1d)",
          border: "1px solid var(--border-input, #1e293b)",
          borderRadius: "var(--border-radius-sm, 6px)",
          color: selectedOption ? "var(--color-input-text, #f8fafc)" : "var(--color-text-muted, #64748b)",
          padding: "9px 12px",
          fontSize: "13px",
          cursor: "pointer",
          userSelect: "none",
          minHeight: "38px",
          boxSizing: "border-box",
          transition: "border-color 0.2s, box-shadow 0.2s",
          ...selectStyle
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
      </div>

      {/* Dropdown flotante */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          background: "var(--bg-container, #1e293b)",
          border: "1px solid var(--border-container, #334155)",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          zIndex: 1050,
          display: "flex",
          flexDirection: "column",
          maxHeight: "250px"
        }}>
          {/* Buscador interno */}
          <div style={{
            display: "flex",
            alignItems: "center",
            padding: "8px",
            borderBottom: "1px solid var(--border-container, #334155)",
            background: "rgba(0,0,0,0.2)"
          }}>
            <Search size={14} style={{ color: "var(--color-text-muted)", marginRight: "8px", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--color-input-text)",
                fontSize: "13px",
                outline: "none"
              }}
              autoFocus
            />
          </div>

          {/* Opciones */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px" }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center" }}>
                Sin resultados
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: opt.value === value ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    color: opt.value === value ? "var(--color-primary-hover)" : "var(--color-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={e => {
                    if (opt.value !== value) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={e => {
                    if (opt.value !== value) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
