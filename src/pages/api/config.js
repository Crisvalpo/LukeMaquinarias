import { createAdminClient } from "../../lib/supabase-server";

export default async function handler(req, res) {
  const supabase = createAdminClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("configuracion_bot")
      .select("*")
      .eq("clave", "bot_phone")
      .single();

    if (error) {
      // Si no existe, podemos retornar un valor por defecto
      return res.status(200).json({ success: true, valor: "56911110001" });
    }
    return res.status(200).json({ success: true, valor: data.valor });
  }

  if (req.method === "POST" || req.method === "PATCH") {
    const { valor } = req.body;
    if (!valor) return res.status(400).json({ success: false, message: "Falta valor" });

    const { data, error } = await supabase
      .from("configuracion_bot")
      .upsert({ clave: "bot_phone", valor })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH"]);
  return res.status(405).json({ success: false, message: "Método no permitido" });
}
