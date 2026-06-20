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
const API_URL = 'http://localhost:3020/api/whatsapp-incoming';
const API_EQUIPOS_URL = 'http://localhost:3020/api/equipos';

async function enviarMensajeSimulado(message) {
  const body = {
    phone: testPhone,
    senderPn: testPhone,
    message: message,
    jid: `${testPhone}@s.whatsapp.net`,
    audio: null
  };

  const res = await fetch(API_URL, {
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

async function obtenerEquipoDesdeAPI(codigoInterno) {
  const res = await fetch(`${API_EQUIPOS_URL}?search=${codigoInterno}`);
  const json = await res.json();
  if (json.success && json.data) {
    return json.data.find(eq => eq.codigo_interno === codigoInterno) || null;
  }
  return null;
}

async function test() {
  console.log("======================================================================");
  console.log("🚀 INICIANDO PRUEBA DE DESVINCULACIÓN DE PERSONAL EN TÉRMINO DE JORNADA");
  console.log("======================================================================");

  // 1. Limpieza de datos
  console.log("🧹 Limpiando sesiones previas del usuario...");
  await supabase.from('sesiones_whatsapp').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('mensajes_chat').delete().eq('whatsapp_remitente', testPhone);
  const { data: oldPers } = await supabase.from('personal').select('id').eq('whatsapp', testPhone).maybeSingle();
  if (oldPers) {
    await supabase.from('reportes_diarios').delete().eq('operador_id', oldPers.id);
    await supabase.from('personal').delete().eq('id', oldPers.id);
  }

  // 2. Obtener un equipo y un proyecto válidos
  const { data: equipo } = await supabase.from('equipos')
    .select('*')
    .neq('tipo_seguimiento', 'vehiculo')
    .limit(1)
    .single();
  const { data: proyecto } = await supabase.from('proyectos').select('*').limit(1).single();

  if (!equipo || !proyecto) {
    console.error("❌ Se requiere al menos un equipo (no vehículo) y un proyecto en la base de datos.");
    return;
  }

  console.log(`📌 Usando equipo: ${equipo.descripcion_equipo} (${equipo.codigo_interno})`);
  console.log(`📌 Usando proyecto: ${proyecto.nombre_proyecto}`);

  const horometroOriginal = Number(equipo.ultimo_horometro) || 1000;
  
  await supabase.from('equipos')
    .update({ pauta_preventiva_activa: null, tipo_seguimiento: 'estandar' })
    .eq('id', equipo.id);

  // 3. Crear operador de prueba
  console.log("👤 Creando operador de prueba...");
  const { data: personal } = await supabase.from('personal').insert({
    rut: testRut,
    nombre_completo: 'Operador Test Desvinculacion',
    whatsapp: testPhone,
    rol: 'Operador',
    proyecto_actual_id: equipo.proyecto_actual_id || proyecto.id,
    activo: true
  }).select().single();

  console.log("✅ Operador de prueba creado con éxito.");

  // 4. PASO 1: Check-in (iniciar sesión)
  console.log(`\n📲 PASO 1: Escaneo de QR (REPORTE:${equipo.codigo_interno})`);
  const paso1 = await enviarMensajeSimulado(`REPORTE:${equipo.codigo_interno}`);
  if (paso1.data.action !== 'SESION_CREADA') {
    throw new Error(`Se esperaba acción SESION_CREADA, se obtuvo: ${paso1.data.action}`);
  }

  // 5. PASO 2: Confirmar horómetro de check-in
  const hInicio = horometroOriginal + 10;
  console.log(`\n📲 PASO 2: Check-in con horómetro ${hInicio}`);
  const paso2 = await enviarMensajeSimulado(`Horómetro inicial ${hInicio}`);
  if (paso2.data.action !== 'CHECKIN_REGISTRADO') {
    throw new Error(`Se esperaba acción CHECKIN_REGISTRADO, se obtuvo: ${paso2.data.action}`);
  }

  // 6. Verificar que el equipo TIENE un reporte_hoy con el operador asignado
  console.log("\n🔍 Verificando asignación activa del operador en la API de equipos...");
  const eqDespuesCheckin = await obtenerEquipoDesdeAPI(equipo.codigo_interno);
  if (!eqDespuesCheckin || !eqDespuesCheckin.reporte_hoy) {
    throw new Error("El equipo no tiene reporte_hoy asignado tras el check-in");
  }
  console.log(`✅ ¡Correcto! Operador asignado en API: ${eqDespuesCheckin.reporte_hoy.operador.nombre_completo}`);

  // 7. PASO 3: Iniciar checkout
  console.log(`\n📲 PASO 3: Iniciar checkout ("Cerrar jornada")`);
  const paso3 = await enviarMensajeSimulado("Cerrar jornada");
  if (paso3.data.action !== 'ESPERANDO_LECTURA_FINAL') {
    throw new Error(`Se esperaba acción ESPERANDO_LECTURA_FINAL, se obtuvo: ${paso3.data.action}`);
  }

  // 8. PASO 4: Completar checkout indicando horómetro final
  const hCierre = hInicio + 8;
  console.log(`\n📲 PASO 4: Completar checkout con horómetro final ${hCierre}`);
  const paso4 = await enviarMensajeSimulado(`Cierre, horómetro final ${hCierre}, sin combustible`);
  if (paso4.data.action !== 'CHECKOUT_PROCESANDO') {
    throw new Error(`Se esperaba acción CHECKOUT_PROCESANDO, se obtuvo: ${paso4.data.action}`);
  }

  // Esperar a que el proceso asíncrono termine y limpie
  console.log("⏳ Esperando 2 segundos para asegurar la consolidación de la jornada...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 9. Verificar que el equipo ya NO tiene un reporte_hoy asignado
  console.log("\n🔍 Verificando que el operador ya no aparece en la API de equipos...");
  const eqDespuesCierre = await obtenerEquipoDesdeAPI(equipo.codigo_interno);
  if (!eqDespuesCierre) {
    throw new Error("No se pudo obtener el equipo tras el cierre de jornada");
  }
  if (eqDespuesCierre.reporte_hoy !== null) {
    throw new Error(`El equipo aún tiene un reporte_hoy activo después del cierre: ${JSON.stringify(eqDespuesCierre.reporte_hoy)}`);
  }
  console.log("✅ ¡Excelente! El campo 'reporte_hoy' es NULL en la respuesta de la API. El personal se ha desvinculado con éxito del equipo.");

  // 10. Limpieza final
  console.log("\n🧹 Limpiando registros de prueba creados...");
  await supabase.from('sesiones_whatsapp').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('mensajes_chat').delete().eq('whatsapp_remitente', testPhone);
  await supabase.from('reportes_diarios').delete().eq('operador_id', personal.id);
  await supabase.from('personal').delete().eq('id', personal.id);
  await supabase.from('equipos').update({ ultimo_horometro: horometroOriginal }).eq('id', equipo.id);

  console.log("======================================================================");
  console.log("✨ PRUEBA FINALIZADA CON ÉXITO: COMPORTAMIENTO DE DESVINCULACIÓN OK");
  console.log("======================================================================");
}

test().catch(err => {
  console.error("❌ Error en la ejecución de la prueba:", err.message);
  process.exit(1);
});
