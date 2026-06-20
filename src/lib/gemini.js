/**
 * Motor de IA Gemini para LukeMontaje
 * Usa REST directo (mismo patrón que LukeDelivery, sin SDK npm)
 * Funciones:
 *  - procesarAudioOperador: Audio base64 → JSON de hito operacional
 *  - analizarImagenEvidencia: Imagen base64 → análisis técnico de evidencia
 *  - analizarIntencionHistorica: Texto/audio → clasificación intención PDF histórico
 *  - procesarMensajeConContexto: Historial de chat → respuesta con memoria conversacional
 */

import { GoogleGenAI } from "@google/genai";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ================================================================
// FUNCIÓN: Chat con memoria conversacional completa
// Recibe historial ordenado cronológicamente y lo pasa a la API nativa
// ================================================================
export async function procesarMensajeConContexto(historialConversacion, listaEspecialidades, contexto = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const listadoEsp = Array.isArray(listaEspecialidades)
    ? listaEspecialidades.map(e => `- ID: ${e.id} | Nombre: ${e.nombre_oficial}`).join("\n")
    : "";

  const systemInstruction = `Eres Jaime, el asistente inteligente de operaciones para el proyecto LukeMontaje (LukeEquipos) en una faena industrial chilena.
Tu tarea es asistir al operador de maquinaria pesada, procesar su mensaje y extraer los datos estructurados para el sistema.

${contexto.pauta_del_dia ? `Pauta preventiva del día fijada por el supervisor: "${contexto.pauta_del_dia}"` : ""}
${contexto.horometro_inicio ? `Horómetro de inicio registrado: ${contexto.horometro_inicio}` : ""}
${contexto.estado_sesion ? `Estado actual de la sesión: ${contexto.estado_sesion}` : ""}
${contexto.seguimiento_completo !== undefined ? `Seguimiento completo de horas/especialidad/operador/rigger: ${contexto.seguimiento_completo}` : ""}

Lista oficial de especialidades:
${listadoEsp}

REGLAS ESTRICTAS DE INTERACCIÓN Y RESPUESTA:
1. Identidad: Eres Jaime. Sé cordial, profesional, directo y usa modismos técnicos de la faena chilena.
2. Tono formal y neutral de género: Dirígete al operador de forma respetuosa y formal. NUNCA uses la palabra "compadre", "compañero" u otros términos informales que asuman género o familiaridad excesiva. Usa un trato formal neutro (por ejemplo: "Le confirmo...", "Por favor indique...", o refiérete por su nombre de pila si lo conoces).
3. Reglas de Flujo (seguimiento_completo):
   - Si seguimiento_completo es false (por ejemplo, Torres de Iluminación): el equipo NO requiere Rigger ni especialidades operacionales de montaje. NO debes preguntar por especialidad ni Rigger, ni asociar especialidades en el JSON (deja 'especialidad_id' y 'especialidad_detectada' como null).
   - Si seguimiento_completo es true (o no se especifica): es un equipo estándar que sí requiere seguimiento detallado de especialidad y operador. Si el estado_sesion es 'CHECKIN' y no se detecta especialidad en el mensaje del operador, pregúntale explícitamente y con respeto con qué especialidad trabajará hoy o si se encuentra disponible.
4. Evita saludar constantemente: NO vuelvas a saludar (ej: "Hola", "Buenos días", "Buenas tardes") en tus respuestas si en el historial de chat ya existe un saludo inicial o si es un mensaje de seguimiento. Sé directo en confirmar el registro del hito de manera ágil.
5. Reglas de Mapeo Semántico:
   - "cañoneros", "viejos de las líneas", "tuberías", "cañerías", "líneas" → especialidad 'Piping'
   - "fierreros", "montadores", "estructuras", "vigas" → especialidad 'Estructuras'
   - "colación", "almuerzo", "hora de almuerzo", "colacion" → estado 'En Colacion'
   - "quedé libre", "máquina disponible", "sin trabajo", "esperando", "no hay trabajo" → estado 'Disponible'
   - "falla", "avería", "detenido", "no prende", "problema mecánico", "accidente" → estado 'Detenido por Falla'
   - "cierre", "terminamos", "fin de jornada", "horómetro final", "cerrando" → tipo_evento 'CIERRE'
   - Números hablados como horómetros: "dos mil trescientos" = 2300, "tres mil" = 3000
   - IMPORTANTE: Si el operador corrige un dato anterior (ej: "me equivoqué, era doce mil trescientos cincuenta"), usa el NUEVO valor corregido.

Responde ÚNICAMENTE con un JSON válido. Esquema:
{
  "tipo_evento": "CHECKIN | Trabajando | Disponible | En Colacion | Detenido por Falla | CIERRE",
  "especialidad_id": "UUID_o_null",
  "especialidad_detectada": "Nombre_oficial_o_null",
  "horometro_inicial": numero_o_null,
  "horometro_final": numero_o_null,
  "petroleo_litros": numero_o_null,
  "horometro_carga_combustible": numero_o_null,
  "es_falla_critica": true_o_false,
  "detalles_texto": "Transcripción resumida del operador",
  "mensaje_conversacional_bot": "Confirmación breve y cordial al operador en español chileno"
}`;

  const payload = {
    contents: historialConversacion,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Gemini] Error procesando mensaje: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`[Gemini] JSON inválido en procesarMensajeConContexto: ${rawText.slice(0, 200)}`);
  }
}

// ================================================================
// FUNCIÓN PRINCIPAL: Procesar audio de operador
// Detecta checkin, hitos intermedios y cierre de jornada
// ================================================================
export async function procesarAudioOperador(audioBase64, mimeType, especialidades, contexto = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const listaEspecialidades = especialidades
    .map(e => `- ID: ${e.id} | Nombre: ${e.nombre_oficial}`)
    .join("\n");

  const tipoSeg = contexto.tipo_seguimiento || 'estandar';

  // ── Prompt adaptado según tipo de equipo ──────────────────────────────
  let promptSistema;

  if (tipoSeg === 'camion') {
    // Camiones de trabajo: sin Rigger ni especialidad, solo horómetro + estado
    promptSistema = `Eres el asistente de extracción de datos para LukeEquipos.
Procesas el audio del CONDUCTOR de un camión de trabajo (pluma, aljibe, tolva, plano, tracto, rampla).
Este equipo NO requiere Rigger ni especialidades de montaje.

Contexto actual:
${contexto.estado_sesion ? `- Estado de sesión: ${contexto.estado_sesion}` : ''}
${contexto.horometro_inicio ? `- Horómetro de inicio: ${contexto.horometro_inicio}` : ''}

Reglas:
- Extrae horómetro_inicial en check-in ("horómetro veinte mil" = 20000)
- Extrae horómetro_final en cierre
- Detecta: "colación" → 'En Colacion', "disponible/esperando" → 'Disponible', "falla/problema" → 'Detenido por Falla', "cerrando/fin" → 'CIERRE'
- NO preguntes por especialidad ni Rigger jamás
- Tono formal y respetuoso, sin "compadre"
- Si no declara horómetro en check-in, pregúntalo de forma directa

Respuesta ÚNICAMENTE en JSON válido:
{
  "tipo_evento": "CHECKIN | Trabajando | Disponible | En Colacion | Detenido por Falla | CIERRE",
  "especialidad_id": null,
  "especialidad_detectada": null,
  "horometro_inicial": numero_o_null,
  "horometro_final": numero_o_null,
  "petroleo_litros": numero_o_null,
  "horometro_carga_combustible": numero_o_null,
  "es_falla_critica": false,
  "detalles_texto": "Transcripción resumida",
  "mensaje_conversacional_bot": "Confirmación breve al conductor en español"
}`;
  } else {
    // Flujo estándar (grúas, maquinaria pesada/semipesada)
    promptSistema = `Eres el asistente de extracción de datos para el proyecto LukeEquipos.
Tu tarea es procesar la transcripción del operador de maquinaria pesada y mapear sus acciones a las tablas del sistema.

Lista oficial de especialidades:
${listaEspecialidades}

Reglas de Mapeo Semántico ESTRICTAS:
- Si seguimiento_completo es false: equipo que NO maneja Rigger ni especialidades. Pon 'especialidad_id' y 'especialidad_detectada' como null.
- Si seguimiento_completo es true: se requiere Rigger y especialidades. Si no indica especialidad ni disponible, solicítala respetuosamente.
- Tono formal y neutral de género. NUNCA uses "compadre".
- "cañoneros", "líneas", "tuberías" → 'Piping'
- "fierreros", "montadores", "estructuras" → 'Estructuras'
- "colación" → 'En Colacion' | "disponible/esperando" → 'Disponible' | "falla" → 'Detenido por Falla' | "cierre/fin" → 'CIERRE'
- Números hablados: "dos mil trescientos" = 2300

Contexto actual:
${contexto.estado_sesion ? `- Estado de sesión: ${contexto.estado_sesion}` : ''}
${contexto.horometro_inicio ? `- Horómetro de inicio: ${contexto.horometro_inicio}` : ''}
${contexto.seguimiento_completo !== undefined ? `- seguimiento_completo: ${contexto.seguimiento_completo}` : ''}

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown.

Esquema de retorno:
{
  "tipo_evento": "CHECKIN | Trabajando | Disponible | En Colacion | Detenido por Falla | CIERRE",
  "especialidad_id": "UUID_o_null",
  "especialidad_detectada": "Nombre_o_null",
  "horometro_inicial": numero_o_null,
  "horometro_final": numero_o_null,
  "petroleo_litros": numero_o_null,
  "horometro_carga_combustible": numero_o_null,
  "es_falla_critica": true_o_false,
  "detalles_texto": "Transcripción resumida"
}`;
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: promptSistema },
          {
            inlineData: {
              mimeType: mimeType || "audio/ogg; codecs=opus",
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Gemini] Error procesando audio: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!rawText) throw new Error("[Gemini] Respuesta vacía");

  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`[Gemini] JSON inválido: ${rawText.slice(0, 200)}`);
  }
}

// ================================================================
// FUNCIÓN: Procesar audio de VEHÍCULO (camionetas, furgones, minibuses)
// Extrae kilometraje (odómetro) y destino/ruta en lugar de horómetro
// ================================================================
export async function procesarAudioVehiculo(audioBase64, mimeType, contexto = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const promptSistema = `Eres el asistente de control de flota vehicular para LukeEquipos.
Procesas el audio del CONDUCTOR o SUPERVISOR que toma un vehículo (camioneta, furgón o minibús) en faena.
Este vehículo NO tiene horómetro ni especialidades. Se registra por KILOMETRAJE y DESTINO.

Contexto actual:
${contexto.estado_sesion ? `- Estado de sesión: ${contexto.estado_sesion}` : ''}
${contexto.km_inicio ? `- Kilometraje de inicio registrado: ${contexto.km_inicio} km` : ''}

Reglas de extracción:
- Detecta km/odómetro ("ochenta y cuatro mil trescientos" = 84300, "84.320" = 84320)
- Detecta destino o ruta mencionada ("voy a Caspana", "sector norte", "faena Atacama")
- Check-in: extrae km_inicial y destino
- Cierre: extrae km_final
- "colación" → estado 'En Colacion'
- "disponible" → estado 'Disponible'
- "falla/problema/accidente" → estado 'Detenido por Falla'
- "cierre/terminé/devolví" → tipo_evento 'CIERRE'
- Si no menciona km en check-in, solicítalo de forma directa y cordial
- Tono formal y respetuoso. Sin "compadre".

Respuesta ÚNICAMENTE en JSON válido:
{
  "tipo_evento": "CHECKIN | En Ruta | En Colacion | Disponible | Detenido por Falla | CIERRE",
  "km_inicial": numero_o_null,
  "km_final": numero_o_null,
  "destino_ruta": "texto_o_null",
  "es_falla_critica": true_o_false,
  "detalles_texto": "Transcripción resumida",
  "mensaje_conversacional_bot": "Confirmación breve al conductor en español"
}`;

  const payload = {
    contents: [{
      parts: [
        { text: promptSistema },
        { inlineData: { mimeType: mimeType || "audio/ogg; codecs=opus", data: audioBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Gemini] Error procesando audio vehículo: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!rawText) throw new Error("[Gemini] Respuesta vacía en procesarAudioVehiculo");

  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`[Gemini] JSON inválido vehículo: ${rawText.slice(0, 200)}`);
  }
}

// ================================================================
// FUNCIÓN: Procesar texto de VEHÍCULO (camionetas, furgones, minibuses)
// Extrae kilometraje (odómetro) y destino/ruta en lugar de horómetro
// ================================================================
export async function procesarTextoVehiculo(texto, contexto = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const promptSistema = `Eres el asistente de control de flota vehicular para LukeEquipos.
Procesas el mensaje de texto del CONDUCTOR o SUPERVISOR que toma un vehículo (camioneta, furgón o minibús) en faena.
Este vehículo NO tiene horómetro ni especialidades. Se registra por KILOMETRAJE y DESTINO.

Contexto actual:
${contexto.estado_sesion ? `- Estado de sesión: ${contexto.estado_sesion}` : ''}
${contexto.km_inicio ? `- Kilometraje de inicio registrado: ${contexto.km_inicio} km` : ''}

Reglas de extracción:
- Detecta km/odómetro ("ochenta y cuatro mil trescientos" = 84300, "84.320" = 84320)
- Detecta destino o ruta mencionada ("voy a Caspana", "sector norte", "faena Atacama")
- Check-in: extrae km_inicial y destino
- Cierre: extrae km_final
- "colación" → estado 'En Colacion'
- "disponible" → estado 'Disponible'
- "falla/problema/accidente" → estado 'Detenido por Falla'
- "cierre/terminé/devolví" → tipo_evento 'CIERRE'
- Si no menciona km en check-in, solicítalo de forma directa y cordial
- Tono formal y respetuoso. Sin "compadre".

Respuesta ÚNICAMENTE en JSON válido:
{
  "tipo_evento": "CHECKIN | En Ruta | En Colacion | Disponible | Detenido por Falla | CIERRE",
  "km_inicial": numero_o_null,
  "km_final": numero_o_null,
  "destino_ruta": "texto_o_null",
  "es_falla_critica": true_o_false,
  "detalles_texto": "Transcripción resumida",
  "mensaje_conversacional_bot": "Confirmación breve al conductor en español"
}`;

  const payload = {
    contents: [{
      parts: [
        { text: promptSistema },
        { text: texto }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Gemini] Error procesando texto vehículo: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!rawText) throw new Error("[Gemini] Respuesta vacía en procesarTextoVehiculo");

  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`[Gemini] JSON inválido vehículo: ${rawText.slice(0, 200)}`);
  }
}

// ================================================================
// FUNCIÓN: Analizar imagen de evidencia con Gemini Vision
// ================================================================

export async function analizarImagenEvidencia(imageBase64, mimeType, contextoEquipo = "") {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const prompt = `Eres un inspector técnico de maquinaria pesada en una faena industrial chilena.
Analiza esta imagen de evidencia enviada por el operador${contextoEquipo ? ` del equipo ${contextoEquipo}` : ''}.

Proporciona:
1. Descripción técnica de lo que se observa (máximo 3 oraciones)
2. Si detectas alguna anomalía, falla, fuga, daño estructural o condición de riesgo
3. Nivel de urgencia: NORMAL, ATENCIÓN o CRÍTICO

Responde en español técnico chileno, de forma concisa y directa.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Gemini] Error analizando imagen: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const analisis = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  const esCritico =
    analisis?.toLowerCase().includes("crítico") ||
    analisis?.toLowerCase().includes("critico") ||
    analisis?.toLowerCase().includes("fuga") ||
    analisis?.toLowerCase().includes("falla crítica") ||
    analisis?.toLowerCase().includes("accidente");

  return {
    analisis: analisis || "No se pudo analizar la imagen.",
    esCritico,
  };
}

// ================================================================
// FUNCIÓN: Clasificador conversacional de intenciones históricas
// ================================================================
export async function analizarIntencionHistorica(textoOAudio, contextoFechaActual = new Date().toISOString().slice(0, 10)) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("[Gemini] GEMINI_API_KEY no configurada");

  const prompt = `Analiza la petición del operador de maquinaria. Determina si está pidiendo un reporte PDF o informe de días anteriores.
Fecha de hoy: ${contextoFechaActual}

Debes retornar estrictamente un JSON con este formato:
{
  "es_consulta_pdf": true o false,
  "fecha_solicitada": "YYYY-MM-DD" o null (Calcula la fecha exacta si dice 'ayer', 'el lunes', 'el 15 de junio', etc. en base a la fecha de hoy)
}`;

  const parts = [{ text: prompt }];

  if (typeof textoOAudio === "object" && textoOAudio?.data) {
    parts.push({
      inlineData: {
        mimeType: textoOAudio.mimeType || "audio/ogg; codecs=opus",
        data: textoOAudio.data,
      }
    });
  } else {
    parts.push({ text: textoOAudio || "Audio entrante" });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 256,
    }
  };

  const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[Gemini] Error en analizarIntencionHistorica: ${res.status} - ${err}`);
    return { es_consulta_pdf: false, fecha_solicitada: null };
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { es_consulta_pdf: false, fecha_solicitada: null };
  }
}
