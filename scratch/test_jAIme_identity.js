const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'maquinaria' }
});

async function run() {
  console.log("=== PROBANDO NUEVO SELECT DE PERSONAL CON PROYECTOS ===");
  
  const phoneClean = '56935264052'; // Teléfono de Cristian Luke
  
  const { data: personal, error } = await supabase
    .from("personal")
    .select("*, proyectos(*)")
    .or(`whatsapp.eq.${phoneClean},whatsapp.eq.+${phoneClean}`)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    console.error("❌ Error en la consulta:", error.message);
    return;
  }

  if (!personal) {
    console.log("⚠️ No se encontró al personal con el teléfono", phoneClean);
    return;
  }

  console.log("✅ Consulta exitosa!");
  console.log("ID:", personal.id);
  console.log("Nombre:", personal.nombre_completo);
  console.log("Rol:", personal.rol);
  console.log("WhatsApp:", personal.whatsapp);
  console.log("Proyecto ID en Objeto:", personal.proyecto_actual_id);
  console.log("Detalle de Proyecto asociado (proyectos):", personal.proyectos);
  
  const proyectoAsignadoInfo = personal.proyectos
    ? `Proyecto actual: "${personal.proyectos.nombre_proyecto}" (Centro de Costos / Contrato / Código CC: "${personal.proyectos.codigo_cc}")`
    : 'Ningún proyecto asignado actualmente.';
    
  console.log("\n--- INFO FORMATEADA PARA PROMPT ---");
  console.log(proyectoAsignadoInfo);
}

run();
