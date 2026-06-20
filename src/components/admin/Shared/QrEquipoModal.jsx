import React, { useState } from "react";
import { X } from "lucide-react";

export default function QrEquipoModal({ equipo, botPhone, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  if (!equipo) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  const landingLink = `${baseUrl}/qr/${equipo.codigo_interno}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(landingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${equipo.codigo_interno}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el QR:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Código QR - ${equipo.codigo_interno}</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              text-align: center;
              margin: 0;
            }
            .qr-container {
              border: 3px solid #000;
              padding: 40px;
              border-radius: 16px;
              background: #fff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            h1 { margin-bottom: 8px; font-size: 32px; font-weight: 800; letter-spacing: 0.5px; }
            h2 { margin-top: 0; color: #444; font-size: 20px; font-weight: 600; margin-bottom: 30px; max-width: 400px; line-height: 1.4; }
            .footer-text { margin-top: 30px; font-size: 14px; font-weight: bold; color: #ff303e; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${equipo.codigo_interno}</h1>
            <h2>${equipo.descripcion_equipo}</h2>
            <img src="${qrUrl}" width="300" height="300" />
            <div class="footer-text">Escanea para iniciar Reporte de Jornada en WhatsApp</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#121e36", border: "1px solid #1c2e52",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#ff303e", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Código QR de Equipo</div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px", marginTop: "2px" }}>{equipo.codigo_interno}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ color: "#cbd5e1", fontSize: "13px", marginBottom: "20px", textAlign: "left", lineHeight: 1.4 }}>
          {equipo.descripcion_equipo}
        </div>

        <div style={{
          background: "white", padding: "20px", borderRadius: "12px",
          display: "inline-block", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          <img src={qrUrl} alt={`QR ${equipo.codigo_interno}`} width={220} height={220} style={{ display: "block" }} />
        </div>

        <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "20px", lineHeight: 1.4 }}>
          Al escanear este QR con el móvil, el operador abrirá la landing page intermedia para registrar su ubicación y foto antes de ir a WhatsApp.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <button onClick={handlePrint} style={{
            background: "#ff303e", border: "none", color: "white",
            borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            transition: "background 0.2s"
          }}>
            Imprimir QR
          </button>
          <button onClick={handleDownload} disabled={downloading} style={{
            background: "#1e3a5f", border: "1px solid #2563eb", color: "#60a5fa",
            borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
          }}>
            {downloading ? "Descargando…" : "Descargar PNG"}
          </button>
        </div>
        <button onClick={handleCopy} style={{
          width: "100%", background: "transparent", border: "1px solid #1c2e52", color: copied ? "#10b981" : "#cbd5e1",
          borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
        }}>
          {copied ? "¡Enlace Copiado!" : "Copiar Enlace WhatsApp"}
        </button>
      </div>
    </div>
  );
}
