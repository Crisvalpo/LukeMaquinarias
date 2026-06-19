import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";

// Cliente Supabase para storage (singleton simple)
let _storageClient = null;
function getStorageClient() {
  if (_storageClient) return _storageClient;
  _storageClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _storageClient;
}

// Descarga imagen desde Supabase Storage y retorna Buffer
async function downloadStorageImage(storagePath) {
  try {
    const supabase = getStorageClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (error || !data) return null;

    // Blob → Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[pdf-generator] Error descargando imagen de Storage:", err.message);
    return null;
  }
}

/**
 * Genera el PDF del reporte diario de jornada.
 * Guarda el archivo en /public/reportes/YYYY/MM/[id_reporte].pdf
 * Retorna la URL pública relativa.
 */
export async function generarReportePDF({
  reporte,
  equipo,
  operador,
  supervisor,
  eventos,
  evidencias,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const fecha = new Date(reporte.fecha);
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");

      // Carpeta de destino dentro de public/
      const dirPath = path.join(process.cwd(), "public", "reportes", String(anio), mes);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `${reporte.id}.pdf`;
      const filePath = path.join(dirPath, fileName);
      const publicUrl = `/reportes/${anio}/${mes}/${fileName}`;

      // ============================================================
      // CONFIGURACIÓN DEL DOCUMENTO
      // ============================================================
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Reporte Diario - ${equipo.descripcion_equipo} - ${reporte.fecha}`,
          Author: "LukeEquipos Sistema de Control Operacional",
          Subject: `Jornada ${operador.nombre_completo}`,
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Colores corporativos
      const AZUL_OSCURO = "#101c33";
      const AZUL_ACENTO = "#2563eb";
      const GRIS_CLARO = "#f8fafc";
      const NARANJA = "#ff303e";
      const VERDE = "#16a34a";
      const ROJO = "#dc2626";
      const AMARILLO = "#d97706";

      const colorEstado = (estado) => {
        switch (estado) {
          case "Trabajando":
          case "Equipo Operativo": return VERDE;
          case "Disponible": return AZUL_ACENTO;
          case "En Colacion": return AMARILLO;
          case "Detenido por Falla": return ROJO;
          default: return AZUL_ACENTO;
        }
      };

      const W = doc.page.width - 100; // ancho útil

      // ============================================================
      // CABECERA
      // ============================================================
      doc.rect(50, 50, W, 80).fill(AZUL_OSCURO);

      doc
        .fillColor("white")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("REPORTE DIARIO DE JORNADA", 70, 65);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text("LukeEquipos — Sistema de Control Operacional", 70, 90);

      doc
        .fontSize(10)
        .text(`Generado: ${new Date().toLocaleString("es-CL")}`, 70, 108);

      // Código de equipo en cabecera
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(NARANJA)
        .text(equipo.codigo_interno, doc.page.width - 170, 75, { align: "right" });

      // ============================================================
      // SECCIÓN 1: DATOS DEL EQUIPO Y PERSONAL
      // ============================================================
      let y = 150;

      doc.fontSize(12).font("Helvetica-Bold").fillColor(AZUL_OSCURO).text("INFORMACIÓN DEL TURNO", 50, y);
      doc.moveTo(50, y + 16).lineTo(50 + W, y + 16).strokeColor(AZUL_ACENTO).lineWidth(2).stroke();
      y += 28;

      const filaInfo = (label, value, x = 50, yPos = y) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text(label.toUpperCase(), x, yPos);
        doc.fontSize(11).font("Helvetica").fillColor(AZUL_OSCURO).text(value || "—", x, yPos + 13);
      };

      filaInfo("Equipo", equipo.descripcion_equipo, 50, y);
      filaInfo("Código", equipo.codigo_interno, 280, y);
      filaInfo("Proveedor", equipo.proveedor, 430, y);
      y += 45;

      filaInfo("Operador", operador.nombre_completo, 50, y);
      filaInfo("Supervisor", supervisor?.nombre_completo || "N/A", 280, y);
      filaInfo("Fecha", reporte.fecha, 430, y);
      y += 45;

      // ============================================================
      // SECCIÓN 2: HORÓMETROS Y COMBUSTIBLE
      // ============================================================
      doc.rect(50, y, W, 4).fill(GRIS_CLARO);
      y += 14;
      doc.fontSize(12).font("Helvetica-Bold").fillColor(AZUL_OSCURO).text("HORÓMETROS Y COMBUSTIBLE", 50, y);
      doc.moveTo(50, y + 16).lineTo(50 + W, y + 16).strokeColor(AZUL_ACENTO).lineWidth(2).stroke();
      y += 28;

      // Caja de métricas
      const boxW = (W - 20) / 4;
      const metricas = [
        { label: "Hr. Inicio", value: reporte.horometro_inicio?.toLocaleString("es-CL") || "—" },
        { label: "Hr. Final", value: reporte.horometro_final?.toLocaleString("es-CL") || "—" },
        { label: "Horas Trabajadas", value: reporte.horas_trabajadas ? `${reporte.horas_trabajadas} hrs` : "—" },
        { label: "Combustible", value: reporte.petroleo_litros ? `${reporte.petroleo_litros} L` : "—" },
      ];

      metricas.forEach((m, i) => {
        const bx = 50 + i * (boxW + 6);
        doc.rect(bx, y, boxW, 50).fill(i % 2 === 0 ? GRIS_CLARO : "white").stroke("#e2e8f0");
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#94a3b8").text(m.label.toUpperCase(), bx + 8, y + 8);
        doc.fontSize(15).font("Helvetica-Bold").fillColor(AZUL_OSCURO).text(m.value, bx + 8, y + 22);
      });
      y += 68;

      // ============================================================
      // SECCIÓN 3: LÍNEA DE TIEMPO DE HITOS
      // ============================================================
      doc.fontSize(12).font("Helvetica-Bold").fillColor(AZUL_OSCURO).text("LÍNEA DE TIEMPO DE JORNADA", 50, y);
      doc.moveTo(50, y + 16).lineTo(50 + W, y + 16).strokeColor(AZUL_ACENTO).lineWidth(2).stroke();
      y += 28;

      if (eventos && eventos.length > 0) {
        // Encabezados de tabla
        doc.rect(50, y, W, 20).fill(AZUL_OSCURO);
        doc.fontSize(9).font("Helvetica-Bold").fillColor("white");
        doc.text("HORA", 58, y + 6);
        doc.text("ESTADO", 158, y + 6);
        doc.text("ESPECIALIDAD", 308, y + 6);
        doc.text("NOTA", 458, y + 6);
        y += 20;

        eventos.forEach((ev, i) => {
          const hora = new Date(ev.hora_evento).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
          const bgColor = i % 2 === 0 ? GRIS_CLARO : "white";
          doc.rect(50, y, W, 22).fill(bgColor).stroke("#e2e8f0");

          doc.fontSize(9).font("Helvetica").fillColor(AZUL_OSCURO).text(hora, 58, y + 7);
          doc.fillColor(colorEstado(ev.estado_hito)).font("Helvetica-Bold").text(ev.estado_hito, 158, y + 7);
          doc.fillColor(AZUL_OSCURO).font("Helvetica").text(ev.especialidad_nombre || "—", 308, y + 7);
          doc.text((ev.nota_transcripcion || "").slice(0, 40) + (ev.nota_transcripcion?.length > 40 ? "…" : ""), 458, y + 7);
          y += 22;

          // Nueva página si se agota el espacio
          if (y > doc.page.height - 150) {
            doc.addPage();
            y = 50;
          }
        });
      } else {
        doc.fontSize(10).fillColor("#94a3b8").text("Sin hitos registrados en esta jornada.", 50, y + 5);
        y += 25;
      }

      // ============================================================
      // SECCIÓN 4: EVIDENCIAS FOTOGRÁFICAS
      // ============================================================
      if (evidencias && evidencias.length > 0) {
        y += 15;
        if (y > doc.page.height - 200) { doc.addPage(); y = 50; }

        doc.fontSize(12).font("Helvetica-Bold").fillColor(AZUL_OSCURO).text("EVIDENCIAS FOTOGRÁFICAS", 50, y);
        doc.moveTo(50, y + 16).lineTo(50 + W, y + 16).strokeColor(AZUL_ACENTO).lineWidth(2).stroke();
        y += 28;

        for (const [i, ev] of evidencias.entries()) {
          if (y > doc.page.height - 180) { doc.addPage(); y = 50; }

          doc.rect(50, y, W, 1).fill("#e2e8f0");
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b")
            .text(`EVIDENCIA ${i + 1}`, 50, y + 5);
          doc.fontSize(10).font("Helvetica").fillColor(AZUL_OSCURO)
            .text(ev.descripcion_analisis_ia || "Sin análisis IA disponible.", 50, y + 18, { width: W });

          // Intentar embeber imagen desde Supabase Storage
          try {
            if (ev.local_storage_path && ev.local_storage_path !== 'upload-error') {
              const imageBuffer = await downloadStorageImage(ev.local_storage_path);
              if (imageBuffer) {
                doc.image(imageBuffer, 50, y + 50, { width: 150, height: 100 });
                y += 165;
              } else {
                doc.fontSize(9).fillColor("#94a3b8").text("[Imagen no disponible]", 50, y + 50);
                y += 70;
              }
            } else {
              y += 50;
            }
          } catch {
            y += 50;
          }
        }
      }

      // ============================================================
      // PIE DE PÁGINA
      // ============================================================
      const bottomY = doc.page.height - 60;
      doc.rect(50, bottomY, W, 40).fill(AZUL_OSCURO);
      doc
        .fontSize(8)
        .fillColor("white")
        .font("Helvetica")
        .text(
          `LukeEquipos | Reporte: ${reporte.id} | Equipo: ${equipo.codigo_interno} | Operador: ${operador.nombre_completo}`,
          60,
          bottomY + 15,
          { width: W - 20, align: "center" }
        );

      doc.end();

      writeStream.on("finish", () => resolve(publicUrl));
      writeStream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}
