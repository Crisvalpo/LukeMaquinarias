import React from "react";
import { FileText } from "lucide-react";

export default function ReportesTab({ hookProps }) {
  const { reportes } = hookProps;

  return (
    <>
      <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 800 }}>Historial de Reportes</h1>

      <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1c2e52" }}>
              {["Fecha", "Equipo", "Operador", "Hr. Inicio", "Hr. Final", "Horas", "PDF"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportes.data.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < reportes.data.length - 1 ? "1px solid #121e36" : "none", background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.fecha}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ color: "#ff303e", fontWeight: 700, fontSize: "12px" }}>{r.equipos?.codigo_interno}</div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>{r.equipos?.descripcion_equipo?.slice(0, 25)}</div>
                </td>
                <td style={{ padding: "12px 16px", color: "white", fontSize: "13px" }}>{r.personal?.nombre_completo}</td>
                <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.horometro_inicio?.toLocaleString("es-CL")}</td>
                <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{r.horometro_final?.toLocaleString("es-CL") || "—"}</td>
                <td style={{ padding: "12px 16px", color: r.horas_trabajadas ? "#16a34a" : "#64748b", fontWeight: 700, fontSize: "13px" }}>
                  {r.horas_trabajadas ? `${r.horas_trabajadas} hrs` : "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {r.pdf_url ? (
                    <a
                      href={r.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#1e3a5f", border: "1px solid #2563eb",
                        color: "#60a5fa", borderRadius: "6px", padding: "4px 10px",
                        fontSize: "11px", fontWeight: 700, textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: "4px",
                      }}
                    >
                      <FileText size={10} /> Descargar
                    </a>
                  ) : (
                    <span style={{ color: "#1c2e52", fontSize: "12px" }}>Sin PDF</span>
                  )}
                </td>
              </tr>
            ))}
            {reportes.data.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No hay reportes generados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
