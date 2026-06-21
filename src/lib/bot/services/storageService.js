import crypto from "crypto";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";

export async function uploadImagenStorage(supabase, imageBase64, mimeType) {
  const buffer = Buffer.from(imageBase64, "base64");
  const fecha = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }); // YYYY-MM-DD
  const ext = mimeType?.includes("png") ? "png" : "jpg";
  const fileName = `${fecha}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: mimeType || "image/jpeg",
      upsert: false,
    });

  if (error) {
    console.error("[storageService] Error subiendo imagen a Storage:", error.message);
    return null;
  }

  console.log(`[storageService] 📸 Imagen subida a Storage: ${fileName}`);
  return data.path;
}

export async function getSignedUrl(supabase, storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24); // 24 horas

  if (error || !data) return null;
  return data.signedUrl;
}
