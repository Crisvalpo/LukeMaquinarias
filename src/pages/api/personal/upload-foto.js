import { createAdminClient } from "../../../lib/supabase-server";
import crypto from "crypto";

// Desactivar el parseador de body por defecto de Next.js si es necesario, 
// pero como es JSON base64 podemos procesarlo normalmente si aumentamos el límite de tamaño.
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
  const { personalId, imageBase64 } = req.body;

  if (!personalId || !imageBase64) {
    return res.status(400).json({ success: false, message: "Faltan parámetros requeridos (personalId, imageBase64)" });
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
    const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const fileName = `avatars/${personalId}/${crypto.randomUUID()}.${ext}`;

    // 2. Subir el buffer de imagen a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo avatar a Storage:", uploadError.message);
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    // 3. Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 4. Actualizar la columna foto_url del personal en la base de datos
    const { error: updateError } = await supabase
      .from("personal")
      .update({ foto_url: publicUrl })
      .eq("id", personalId);

    if (updateError) {
      console.error("Error actualizando foto_url del personal:", updateError.message);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      foto_url: publicUrl
    });

  } catch (err) {
    console.error("Error crítico en upload-foto:", err.message);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}
