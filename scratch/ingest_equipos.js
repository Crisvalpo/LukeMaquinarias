const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno locales
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

// Función de ayuda para parsear la ubicación (centro de costos y nombre de la obra)
function parseUbicacion(raw) {
  if (!raw || raw.trim() === '') return { cc: null, nombre: 'Sin Ubicación' };
  
  // Buscar patrón CC-XXXX
  const ccMatch = raw.match(/CC-(\d+)/i);
  let cc = null;
  if (ccMatch) {
    const num = ccMatch[1]; // ej. "0389" o "0003"
    if (num.length === 4) {
      cc = `EIMI00${num.substring(1)}`; // "0389" -> "EIMI00389", "0003" -> "EIMI00003"
    } else {
      cc = `EIMI${num.padStart(5, '0')}`;
    }
  }

  // Extraer y limpiar el nombre de la obra
  let nombre = raw.replace(/\/\/ GRUPO EMI\/?/gi, '');
  nombre = nombre.replace(/CC-\d+/gi, '');
  nombre = nombre.replace(/^[\s\-/]+|[\s\-/]+$/g, ''); // quitar guiones y barras al inicio/fin
  nombre = nombre.replace(/\/+$/, ''); // quitar barras al final
  nombre = nombre.replace(/""/g, ' '); // normalizar comillas repetidas
  nombre = nombre.trim();

  if (!nombre || nombre === '') {
    nombre = cc ? `Obra ${cc}` : 'Sin Nombre';
  }

  return { cc, nombre };
}

// Función de ayuda para mapear el estado al check constraint permitido
function mapEstado(estadoRaw) {
  if (!estadoRaw) return 'Disponible';
  
  const raw = estadoRaw.toUpperCase();
  if (raw.includes('OPERATIVO') || raw.includes('EN USO')) {
    return 'Disponible'; // O 'Equipo Operativo'
  }
  if (raw.includes('REPARACION') || raw.includes('MANTENCION') || raw.includes('FUERA DE SERVICIO')) {
    return 'Detenido por Falla';
  }
  if (raw.includes('PREPARACION') || raw.includes('VENTA')) {
    return 'Disponible';
  }
  return 'Disponible';
}

async function run() {
  console.log("=== INICIANDO INGESTA DE EQUIPOS REALES ===");
  
  // 1. Obtener todos los proyectos existentes en la base de datos
  const { data: obrasExistentes, error: errObras } = await supabase
    .from('proyectos')
    .select('id, codigo_cc, nombre_proyecto');
    
  if (errObras) {
    console.error("❌ Error al consultar proyectos:", errObras.message);
    return;
  }
  
  const mapaProyectos = {}; // codigo_cc -> id
  obrasExistentes.forEach(o => {
    mapaProyectos[o.codigo_cc.toUpperCase()] = o.id;
  });
  
  console.log(`Proyectos cargados desde la BD: ${obrasExistentes.length}`);

  // 2. Leer archivo CSV
  const csvPath = path.join(__dirname, '../Informe Gerencia Operacional_19-06 (1).csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No existe el archivo CSV en la ruta: ${csvPath}`);
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  console.log(`Líneas leídas del CSV: ${lines.length}`);
  
  let insertados = 0;
  let errores = 0;
  
  // Saltamos la primera línea (cabecera)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '') continue;
    
    const cols = line.split(';');
    if (cols.length < 11) {
      console.warn(`⚠️ Línea ${i + 1} malformada (menos de 11 columnas):`, line);
      continue;
    }
    
    const codigo = cols[0].trim();
    const nombre = cols[1].trim();
    const fabricante = cols[2].trim();
    const modelo = cols[3].trim();
    const serial = cols[4].trim();
    const patente = cols[5].trim();
    const tipo = cols[6].trim();
    const categoria = cols[7].trim();
    const anioRaw = cols[8].trim();
    const ubicacionRaw = cols[9].trim();
    const estadoRaw = cols[10].trim();
    
    if (!codigo || codigo === '') continue;
    
    // Parsear año
    const anio = parseInt(anioRaw) || null;
    
    // Parsear ubicación/proyecto
    const { cc, nombre: nombreObra } = parseUbicacion(ubicacionRaw);
    let proyectoId = null;
    
    if (cc) {
      const ccUpper = cc.toUpperCase();
      if (mapaProyectos[ccUpper]) {
        proyectoId = mapaProyectos[ccUpper];
      } else {
        // Crear proyecto faltante en base de datos
        console.log(`➕ Creando proyecto faltante: ${cc} - ${nombreObra}`);
        const { data: nuevaObra, error: errObra } = await supabase
          .from('proyectos')
          .insert({
            nombre_proyecto: nombreObra,
            codigo_cc: cc,
            activa: true
          })
          .select('id')
          .single();
          
        if (errObra) {
          console.error(`❌ Error al crear el proyecto ${cc}:`, errObra.message);
        } else if (nuevaObra) {
          proyectoId = nuevaObra.id;
          mapaProyectos[ccUpper] = proyectoId;
        }
      }
    }
    
    // Mapear estado
    const estado = mapEstado(estadoRaw);
    
    // Concatenar descripción para el operador
    const descripcion = `${nombre} ${fabricante} ${modelo}`.trim();
    
    // Insertar equipo
    const equipoData = {
      codigo_interno: codigo,
      descripcion_equipo: descripcion,
      proveedor: 'EIMISA',
      proyecto_actual_id: proyectoId,
      estado_actual: estado,
      patente: patente !== '' ? patente : null,
      marca: fabricante !== '' ? fabricante : null,
      modelo: modelo !== '' ? modelo : null,
      numero_serial: serial !== '' ? serial : null,
      tipo: tipo !== '' ? tipo : null,
      categoria: categoria !== '' ? categoria : null,
      anio_fabricacion: anio
    };
    
    const { error: errInsert } = await supabase
      .from('equipos')
      .insert(equipoData);
      
    if (errInsert) {
      console.error(`❌ Error al insertar equipo ${codigo}:`, errInsert.message, errInsert.details || '');
      errores++;
    } else {
      insertados++;
    }
  }
  
  console.log(`\n=== INGESTA COMPLETA ===`);
  console.log(`Equipos insertados con éxito: ${insertados}`);
  console.log(`Errores encontrados: ${errores}`);
}

run();
