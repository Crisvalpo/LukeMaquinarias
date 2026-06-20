const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer variables de .env.local
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error("No existe el archivo .env.local");
  process.exit(1);
}
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
const secret = env['WA_BRIDGE_SECRET'] || 'lm-bridge-eQ5wN9pRxA3vKz8j';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'maquinaria' }
});

const testPhone = '56999990099';
const testRut = '99.999.009-9';
const BASE_URL = 'http://localhost:3020';

async function enviarMensajeSimulado(message) {
  const body = {
    phone: testPhone,
    senderPn: testPhone,
    message: message,
    jid: `${testPhone}@s.whatsapp.net`,
    audio: null
  };

  const res = await fetch(`${BASE_URL}/api/whatsapp-incoming`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wa-bridge-secret': secret
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function test() {
  console.log("======================================================================");
  console.log("🚀 INICIANDO PRUEBA DE INTEGRACIÓN: CHECK-IN WEB EN LANDING QR");
  console.log("======================================================================");

  // 1. Limpieza de datos
  console.log("🧹 Limpiando sesiones y reportes anteriores del operador de prueba...");
  await supabase.from('sesiones_whatsapp').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('mensajes_chat').delete().eq('whatsapp_remitente', testPhone);
  const { data: oldPers } = await supabase.from('personal').select('id').eq('whatsapp', testPhone).maybeSingle();
  if (oldPers) {
    await supabase.from('reportes_diarios').delete().eq('operador_id', oldPers.id);
    await supabase.from('personal').delete().eq('id', oldPers.id);
  }

  // 2. Obtener un equipo y un proyecto válidos
  const { data: equipo } = await supabase.from('equipos').select('*').limit(1).single();
  const { data: proyecto } = await supabase.from('proyectos').select('*').limit(1).single();

  if (!equipo || !proyecto) {
    console.error("❌ Se requiere al menos un equipo y un proyecto en la base de datos.");
    return;
  }

  console.log(`📌 Usando equipo: ${equipo.descripcion_equipo} (${equipo.codigo_interno}), seguimiento: ${equipo.tipo_seguimiento}`);
  console.log(`📌 Usando proyecto: ${proyecto.nombre_proyecto}`);

  // 3. Crear operador de prueba
  console.log("👤 Creando operador de prueba...");
  const { data: personal } = await supabase.from('personal').insert({
    rut: testRut,
    nombre_completo: 'Operador Test Checkin Web',
    whatsapp: testPhone,
    rol: 'Operador',
    proyecto_actual_id: equipo.proyecto_actual_id || proyecto.id,
    activo: true
  }).select().single();

  console.log("✅ Operador de prueba creado con éxito.");

  // 4. Invocar API de Check-in Web local
  console.log("\n🌐 PASO 1: Invocando API /api/equipos/checkin-web...");
  const checkinBody = {
    equipoId: equipo.id,
    operadorId: personal.id,
    valorLectura: 3100.5,
    latitud: -33.45678,
    longitud: -70.67890,
    pautaConfirmada: true
  };

  const resCheckin = await fetch(`${BASE_URL}/api/equipos/checkin-web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkinBody)
  });

  const jsonCheckin = await resCheckin.json();
  console.log("🤖 Respuesta API Check-in:", jsonCheckin);

  if (!resCheckin.ok || !jsonCheckin.success) {
    throw new Error(`Error en API checkin-web: ${JSON.stringify(jsonCheckin)}`);
  }
  console.log("✅ API checkin-web retornó success: true y ID de reporte:", jsonCheckin.reporteId);

  // 5. Verificar que la DB tenga los datos correctos
  console.log("\n📊 PASO 2: Verificando datos guardados en base de datos...");
  
  // A. Reporte diario
  const { data: reporte } = await supabase.from('reportes_diarios')
    .select('*')
    .eq('id', jsonCheckin.reporteId)
    .single();
  
  const esVehiculo = equipo.tipo_seguimiento === 'vehiculo';
  const lecturaGuardada = esVehiculo ? reporte.km_inicial : reporte.horometro_inicio;
  console.log(`⏱ Lectura inicial en reporte: ${lecturaGuardada} (esperado: 3100.5)`);
  if (Number(lecturaGuardada) !== 3100.5) {
    throw new Error(`La lectura guardada no coincide. Obtenido: ${lecturaGuardada}`);
  }
  console.log("✅ Reporte diario creado con la lectura inicial correspondiente.");

  // B. Ubicación del equipo
  const { data: eqCheck } = await supabase.from('equipos')
    .select('latitud_actual, longitud_actual, ultimo_horometro, ultimo_odometro')
    .eq('id', equipo.id)
    .single();

  console.log(`📍 Coordenadas en equipo: Lat ${eqCheck.latitud_actual}, Lng ${eqCheck.longitud_actual} (esperado: -33.45678, -70.67890)`);
  if (Number(eqCheck.latitud_actual) !== -33.45678 || Number(eqCheck.longitud_actual) !== -70.67890) {
    throw new Error("Las coordenadas del equipo no se actualizaron correctamente.");
  }
  
  const ultLecturaEq = esVehiculo ? eqCheck.ultimo_odometro : eqCheck.ultimo_horometro;
  console.log(`⏱ Última lectura en equipo: ${ultLecturaEq} (esperado: 3100.5)`);
  if (Number(ultLecturaEq) !== 3100.5) {
    throw new Error("La última lectura de la tabla equipos no se actualizó.");
  }
  console.log("✅ Tabla equipos actualizada con ubicación y última lectura.");

  // C. Sesión de WhatsApp
  const { data: sesionCheck } = await supabase.from('sesiones_whatsapp')
    .select('estado_espera, reporte_activo_id')
    .eq('whatsapp_remitente', testPhone)
    .single();

  console.log(`💬 Estado de la sesión: ${sesionCheck.estado_espera} (esperado: SESION_ABIERTA_INTERMEDIA)`);
  if (sesionCheck.estado_espera !== 'SESION_ABIERTA_INTERMEDIA') {
    throw new Error(`La sesión debió quedar en SESION_ABIERTA_INTERMEDIA, pero está en: ${sesionCheck.estado_espera}`);
  }
  console.log("✅ Sesión de WhatsApp configurada en estado intermedio.");

  // 6. Simular redirección a WhatsApp (Envío de REPORTE:CODIGO)
  console.log(`\n📲 PASO 3: Redirigiendo a WhatsApp (mensaje: "REPORTE:${equipo.codigo_interno}")`);
  const paso3 = await enviarMensajeSimulado(`REPORTE:${equipo.codigo_interno}`);
  console.log("🤖 Respuesta bot:", paso3.data);

  if (paso3.data.action !== 'SESION_INICIADA_WEB' && paso3.data.action !== 'SESION_YA_ACTIVA_MISMO_EQUIPO') {
    throw new Error(`Se esperaba acción SESION_INICIADA_WEB o SESION_YA_ACTIVA_MISMO_EQUIPO, se obtuvo: ${paso3.data.action}`);
  }
  console.log("✅ El bot detectó el inicio desde la web y respondió positivamente.");

  // 7. Limpieza final de datos de prueba
  console.log("\n🧹 Limpiando registros de prueba creados...");
  await supabase.from('sesiones_whatsapp').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('mensajes_chat').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('reportes_diarios').delete().eq('operador_id', personal.id);
  await supabase.from('personal').delete().eq('id', personal.id);

  console.log("======================================================================");
  console.log("✨ PRUEBA FINALIZADA CON ÉXITO: TODO FUNCIONANDO A LA PERFECCIÓN");
  console.log("======================================================================");
}

// Iniciar pruebas
test().catch(err => {
  console.error("❌ Error en la ejecución de la prueba:", err.message || err);
});
