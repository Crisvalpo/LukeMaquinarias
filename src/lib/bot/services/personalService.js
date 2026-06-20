export async function buscarPersonal(supabase, phoneClean) {
  const { data: personal } = await supabase
    .from("personal")
    .select("*, proyectos(*)")
    .or(`whatsapp.eq.${phoneClean},whatsapp.eq.+${phoneClean}`)
    .eq("activo", true)
    .maybeSingle();
  return personal;
}
