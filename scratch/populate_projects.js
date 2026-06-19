const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Leer .env.local manualmente
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
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltantes en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'maquinaria' }
});

// 2. Parsear el archivo CSV
const csvPath = path.join(__dirname, '../crd10_core_projects.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
const headers = lines[0].slice(1, -1).split('","');

console.log(`Cargando ${lines.length - 1} proyectos desde el CSV...`);

const projects = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Parseo simple teniendo en cuenta comillas
  const cols = line.slice(1, -1).split('","');
  
  if (cols.length < 20) continue;

  const costCenter = cols[4] ? cols[4].trim() : '';
  const location = cols[10] ? cols[10].trim() : '';
  const projectName = cols[19] ? cols[19].trim() : '';

  if (!costCenter || !projectName) {
    console.log(`Fila ${i} omitida por falta de CC o Nombre.`);
    continue;
  }

  projects.push({
    nombre_obra: projectName,
    codigo_cc: costCenter,
    ubicacion: location || null,
    activa: true
  });
}

// 3. Insertar/Upsertar en Supabase
async function run() {
  console.log(`Enviando ${projects.length} proyectos a Supabase...`);
  
  for (const proj of projects) {
    const { data, error } = await supabase
      .from('obras')
      .upsert(proj, { onConflict: 'codigo_cc' })
      .select();

    if (error) {
      console.error(`Error insertando ${proj.codigo_cc}:`, error.message);
    } else {
      console.log(`Proyecto ${proj.codigo_cc} (${proj.nombre_obra.slice(0, 40)}...) procesado con éxito.`);
    }
  }
  
  console.log('Carga completada.');
}

run();
