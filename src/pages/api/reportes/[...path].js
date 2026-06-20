import { createAdminClient } from "../../../lib/supabase-server";
import fs from "fs";
import path from "path";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { path: pathParts } = req.query;

  if (!pathParts || pathParts.length < 3) {
    return res.status(400).json({ error: "Ruta de reporte inválida" });
  }

  const anio = pathParts[0];
  const mes = pathParts[1];
  const fileName = pathParts[2]; // ej: "reporte-uuid.pdf"
  const storagePath = `reportes/${anio}/${mes}/${fileName}`;

  try {
    const supabase = createAdminClient();

    // 1. Intentar obtener una URL firmada de Supabase Storage para servirlo de forma segura y veloz
    console.log(`[api/reportes] Generando URL firmada para: ${storagePath}`);
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 2); // URL con validez de 2 horas

    if (!signedErr && signedData?.signedUrl) {
      console.log(`[api/reportes] Redireccionando a Supabase Storage...`);
      return res.redirect(302, signedData.signedUrl);
    }

    if (signedErr) {
      console.warn(`[api/reportes] Error obteniendo URL firmada en Supabase:`, signedErr.message);
    }
  } catch (err) {
    console.error(`[api/reportes] Error conectando a Supabase para obtener el PDF:`, err.message);
  }

  // 2. Fallback: Buscar localmente en el disco del servidor (si por algún motivo falló Supabase)
  try {
    const localFilePath = path.join(process.cwd(), "public", "reportes", anio, mes, fileName);
    console.log(`[api/reportes] Buscando reporte local de respaldo en: ${localFilePath}`);

    if (fs.existsSync(localFilePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      const fileStream = fs.createReadStream(localFilePath);
      return fileStream.pipe(res);
    }
  } catch (localErr) {
    console.error(`[api/reportes] Error al intentar leer el PDF local de respaldo:`, localErr.message);
  }

  // 3. Si no existe en la nube ni localmente
  return res.status(404).json({ error: "El archivo del reporte diario no fue encontrado." });
}
