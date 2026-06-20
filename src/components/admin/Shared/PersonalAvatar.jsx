import React, { useState } from "react";

export default function PersonalAvatar({ persona, rolEtiqueta, cfgBorder }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  if (!persona) return null;

  const iniciales = persona.nombre_completo
    ? persona.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")
    : "??";

  // URL de WhatsApp directa
  const whatsappUrl = persona.whatsapp
    ? `https://wa.me/${persona.whatsapp.replace(/\+/g, "").replace(/\s/g, "")}`
    : null;

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => {
        setShowTooltip(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        setIsHovered(false);
      }}
    >
      {/* Círculo del avatar */}
      <div
        onClick={() => {
          if (whatsappUrl) window.open(whatsappUrl, "_blank");
        }}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          cursor: "pointer",
          border: `2px solid ${cfgBorder || "#2563eb"}`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15, 23, 42, 0.8)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
          transform: isHovered ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {persona.foto_url ? (
          <img
            src={persona.foto_url}
            alt={persona.nombre_completo}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#60a5fa" }}>
            {iniciales}
          </span>
        )}
      </div>

      {/* Tooltip emergente (popover premium) */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0b1329",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)",
            borderRadius: "8px",
            padding: "10px 12px",
            zIndex: 100,
            width: "180px",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            textAlign: "left"
          }}
        >
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {rolEtiqueta}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "white", lineHeight: "1.2" }}>
            {persona.nombre_completo}
          </div>
          {persona.whatsapp && (
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
              📱 {persona.whatsapp}
            </div>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                background: "#25d366",
                color: "white",
                textDecoration: "none",
                fontSize: "10px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "4px",
                textAlign: "center",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#1ebd54"}
              onMouseOut={(e) => e.currentTarget.style.background = "#25d366"}
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
