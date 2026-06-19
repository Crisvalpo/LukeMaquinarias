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
    .limit(4);

  if (errorObras) {
    console.error('Error al obtener obras:', errorObras.message);
    process.exit(1);
  }

  if (obras.length === 0) {
    console.error('No se encontraron proyectos para asociar al personal.');
    process.exit(1);
  }

  console.log(`Se asociarán los usuarios a los siguientes proyectos: ${obras.map(o => o.codigo_cc).join(', ')}`);

  const personalTemplates = [
    // Supervisors
    { rut: '10.123.456-7', nombre_completo: 'Héctor Muñoz Espinoza', whatsapp: '56911110001', rol: 'Supervisor', turno_tipo: '14x14', jornada_tipo: 'Dia' },
    { rut: '11.234.567-8', nombre_completo: 'Alejandro Valenzuela Olea', whatsapp: '56911110002', rol: 'Supervisor', turno_tipo: '5x2', jornada_tipo: 'Dia' },
    { rut: '12.345.678-9', nombre_completo: 'Rodrigo Tapia Gallardo', whatsapp: '56911110003', rol: 'Supervisor', turno_tipo: '7x7', jornada_tipo: 'Dia' },
    // Operadores
    { rut: '13.456.789-0', nombre_completo: 'Cristián Díaz Fuentes', whatsapp: '56911110004', rol: 'Operador', turno_tipo: '14x14', jornada_tipo: 'Dia' },
    { rut: '14.567.890-1', nombre_completo: 'Sebastián Contreras Pinto', whatsapp: '56911110005', rol: 'Operador', turno_tipo: '14x14', jornada_tipo: 'Noche' },
    { rut: '15.678.901-2', nombre_completo: 'Manuel Araya Olivares', whatsapp: '56911110006', rol: 'Operador', turno_tipo: '7x7', jornada_tipo: 'Dia' },
    // Riggers
    { rut: '16.789.012-3', nombre_completo: 'Francisco Flores Vargas', whatsapp: '56911110007', rol: 'Rigger', turno_tipo: '14x14', jornada_tipo: 'Dia' },
    { rut: '17.890.123-4', nombre_completo: 'Claudio Castillo Romero', whatsapp: '56911110008', rol: 'Rigger', turno_tipo: '5x2', jornada_tipo: 'Dia' },
    { rut: '18.901.234-5', nombre_completo: 'Marcelo Sánchez Soto', whatsapp: '56911110009', rol: 'Rigger', turno_tipo: '7x7', jornada_tipo: 'Noche' },
    // Jefes de Area
    { rut: '19.012.345-6', nombre_completo: 'Eduardo Carrasco Leiva', whatsapp: '56911110010', rol: 'Jefe de Area', turno_tipo: '5x2', jornada_tipo: 'Dia' },
    { rut: '20.123.456-k', nombre_completo: 'José Luis Rojas Cabrera', whatsapp: '56911110011', rol: 'Jefe de Area', turno_tipo: '7x7', jornada_tipo: 'Dia' },
    { rut: '21.234.567-0', nombre_completo: 'Patricio Herrera Muñoz', whatsapp: '56911110012', rol: 'Jefe de Area', turno_tipo: '14x14', jornada_tipo: 'Dia' }
  ];

  console.log('Insertando personal de ejemplo...');

  for (let i = 0; i < personalTemplates.length; i++) {
    const template = personalTemplates[i];
    // Asignar proyecto de forma rotativa
    const obra = obras[i % obras.length];
    
    const userToInsert = {
      ...template,
      obra_actual_id: obra.id,
      activo: true
    };

    const { data, error } = await supabase
      .from('personal')
      .upsert(userToInsert, { onConflict: 'rut' })
      .select();

    if (error) {
      console.error(`Error al insertar ${template.nombre_completo}:`, error.message);
    } else {
      console.log(`Usuario insertado/actualizado: ${template.nombre_completo} (${template.rol}) en proyecto ${obra.codigo_cc}`);
    }
  }

  console.log('Proceso de población de personal de ejemplo finalizado.');
}

run();
