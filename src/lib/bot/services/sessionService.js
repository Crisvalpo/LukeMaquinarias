export async function obtenerSesionActiva(supabase, phoneClean) {
  const { data: sesion } = await supabase
    .from("sesiones_whatsapp")
    .select("*, reportes_diarios(*)")
    .eq("whatsapp_remitente", phoneClean)
    .maybeSingle();
  return sesion;
}
