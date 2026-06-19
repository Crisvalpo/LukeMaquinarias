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

async function run() {
  console.log('Obteniendo proyectos disponibles...');
  const { data: obras, error: errorObras } = await supabase
    .from('obras')
    .select('id, nombre_obra, codigo_cc')
    .limit(5);

  if (errorObras) {
    console.error('Error al obtener obras:', errorObras.message);
    process.exit(1);
  }

  if (obras.length === 0) {
    console.error('No se encontraron proyectos para asociar a los equipos.');
    process.exit(1);
  }

  const baseLat = -33.6129369;
  const baseLng = -70.7164499;

  const equiposTemplates = [
    { codigo_interno: 'EIMI00501', descripcion_equipo: 'Camión Pluma Mercedes-Benz Actros 3344', proveedor: 'EIMISA', estado_actual: 'Equipo Operativo' },
    { codigo_interno: 'EIMI00502', descripcion_equipo: 'Camión Pluma Scania G450 XT 8x4', proveedor: 'EIMISA', estado_actual: 'Disponible' },
    { codigo_interno: 'EIMI00503', descripcion_equipo: 'Camión Pluma Volvo FMX 460', proveedor: 'EIMISA', estado_actual: 'En Colacion' },
    { codigo_interno: 'EIMI00504', descripcion_equipo: 'Excavadora Caterpillar 320D3', proveedor: 'EIMISA', estado_actual: 'Equipo Operativo' },
    { codigo_interno: 'EIMI00505', descripcion_equipo: 'Excavadora Komatsu PC200-8M0', proveedor: 'Arriendo Rent', estado_actual: 'Disponible' },
    { codigo_interno: 'EIMI00506', descripcion_equipo: 'Excavadora John Deere 210G', proveedor: 'EIMISA', estado_actual: 'Detenido por Falla' },
    { codigo_interno: 'EIMI00507', descripcion_equipo: 'Grúa Móvil Liebherr LTM 1100-4.2 (100 Ton)', proveedor: 'EIMISA', estado_actual: 'Equipo Operativo' },
    { codigo_interno: 'EIMI00508', descripcion_equipo: 'Grúa Móvil Grove GMK4100L-1 (100 Ton)', proveedor: 'Arriendo Rent', estado_actual: 'Disponible' },
    { codigo_interno: 'EIMI00509', descripcion_equipo: 'Grúa Horquilla Toyota 8FDU25 (2.5 Ton)', proveedor: 'EIMISA', estado_actual: 'En Colacion' },
    { codigo_interno: 'EIMI00510', descripcion_equipo: 'Grúa Torre Potain MCT 85', proveedor: 'EIMISA', estado_actual: 'Equipo Operativo' }
  ];

  console.log('Insertando equipos de ejemplo con geolocalización simulada...');

  for (let i = 0; i < equiposTemplates.length; i++) {
    const template = equiposTemplates[i];
    const obra = obras[i % obras.length];

    // Variación de posición aleatoria (~1-3 km a la redonda del taller)
    const latOffset = (Math.random() * 0.03) - 0.015;
    const lngOffset = (Math.random() * 0.03) - 0.015;

    const equipoToInsert = {
      ...template,
      obra_actual_id: obra.id,
      latitud_actual: baseLat + latOffset,
      longitud_actual: baseLng + lngOffset,
      ultima_ubicacion_fecha: new Date(Date.now() - Math.floor(Math.random() * 7200000)).toISOString() // ultimas 2 horas
    };

    const { data, error } = await supabase
      .from('equipos')
      .upsert(equipoToInsert, { onConflict: 'codigo_interno' })
      .select();

    if (error) {
      console.error(`Error al insertar equipo ${template.codigo_interno}:`, error.message);
    } else {
      console.log(`Equipo procesado: ${template.codigo_interno} — ${template.descripcion_equipo} en estado ${template.estado_actual} (Proyecto: ${obra.codigo_cc})`);
    }
  }

  console.log('Población de equipos de ejemplo finalizada.');
}

run();
