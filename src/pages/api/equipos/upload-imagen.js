import { createAdminClient } from "../../../lib/supabase-server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb", // Aumentar límite para aceptar imágenes en base64
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const supabase = createAdminClient();
  const { equipoId, imageBase64 } = req.body;

  if (!equipoId || !imageBase64) {
    return res.status(400).json({ success: false, message: "Faltan parámetros requeridos (equipoId, imageBase64)" });
  }

  try {
    // 1. Extraer los datos crudos del Base64
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const BUCKET = "imagenes-equipos";
    
    // Determinar extensión del archivo
    let ext = "jpg";
    if (mimeType.includes("png")) ext = "png";
    if (mimeType.includes("webp")) ext = "webp";
    
    const fileName = `${equipoId}/fondo.${ext}`;

    // 2. Subir el buffer de imagen a Supabase Storage (upsert para sobrescribir)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo imagen de equipo a Storage:", uploadError.message);
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    // 3. Obtener la URL pública permanente (el bucket es público)
    const publicUrl = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName).data.publicUrl;

    // 4. Actualizar la columna imagen_url del equipo en la base de datos
    const { error: updateError } = await supabase
      .from("equipos")
      .update({ imagen_url: publicUrl })
      .eq("id", equipoId);

    if (updateError) {
      console.error("Error actualizando imagen_url del equipo:", updateError.message);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      imagen_url: publicUrl
    });

  } catch (err) {
    console.error("Error crítico en upload-imagen de equipo:", err.message);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}
