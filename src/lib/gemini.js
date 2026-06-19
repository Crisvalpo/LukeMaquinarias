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

Lista oficial de especialidades:
${listadoEsp}

REGLAS ESTRICTAS DE INTERACCIÓN Y RESPUESTA:
1. Identidad: Eres Jaime. Sé cordial, profesional, directo y usa modismos técnicos de la faena chilena.
2. Evita saludar constantemente: NO vuelvas a saludar (ej: "Hola", "Buenos días", "Buenas tardes") en tus respuestas si en el historial de chat ya existe un saludo inicial o si es un mensaje de seguimiento. Sé directo en confirmar el registro del hito de manera ágil.
3. Reglas de Mapeo Semántico:
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

  const ai = new GoogleGenAI({ apiKey: geminiKey });

  // El historial viene en formato { role: 'user'|'model', parts: [{ text }] }
  // Separamos el último mensaje del usuario para enviarlo con sendMessage
  const historialPrevio = historialConversacion.slice(0, -1);
  const ultimoMensaje = historialConversacion[historialConversacion.length - 1];
  const textoPeticion = ultimoMensaje?.parts?.[0]?.text || "";

  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    history: historialPrevio,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  });

  const response = await chat.sendMessage({ message: textoPeticion });
  const rawText = response.text?.trim() || "{}";

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

  const promptSistema = `Eres el asistente de extracción de datos para el proyecto LukeEquipos.
Tu tarea es procesar la transcripción del operador de maquinaria pesada y mapear sus acciones a las tablas del sistema.

Lista oficial de especialidades:
${listaEspecialidades}

Reglas de Mapeo Semántico ESTRICTAS:
- "cañoneros", "viejos de las líneas", "tuberías", "cañerías", "líneas" → especialidad 'Piping'
- "fierreros", "montadores", "estructuras", "vigas" → especialidad 'Estructuras'
- "colación", "almuerzo", "hora de almuerzo", "colacion" → estado 'En Colacion'
- "quedé libre", "máquina disponible", "sin trabajo", "esperando", "no hay trabajo" → estado 'Disponible'
- "falla", "avería", "detenido", "no prende", "problema mecánico", "accidente" → estado 'Detenido por Falla'
- "cierre", "terminamos", "fin de jornada", "horómetro final", "cerrando" → tipo_evento 'CIERRE'
- Números hablados como horómetros: "dos mil trescientos" = 2300, "tres mil" = 3000

Contexto actual:
${contexto.estado_sesion ? `- Estado de sesión: ${contexto.estado_sesion}` : ''}
${contexto.horometro_inicio ? `- Horómetro de inicio: ${contexto.horometro_inicio}` : ''}

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin bloques de código.

Esquema de retorno:
{
  "tipo_evento": "CHECKIN | Trabajando | Disponible | En Colacion | Detenido por Falla | CIERRE",
  "especialidad_id": "UUID_de_la_especialidad_o_null",
  "especialidad_detectada": "Nombre_oficial_o_null",
  "horometro_inicial": numero_o_null,
  "horometro_final": numero_o_null,
  "petroleo_litros": numero_o_null,
  "horometro_carga_combustible": numero_o_null,
  "es_falla_critica": true_o_false,
  "detalles_texto": "Transcripción resumida de las labores del operador"
}`;

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
    // Intentar extraer JSON del texto si viene con texto adicional
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`[Gemini] JSON inválido: ${rawText.slice(0, 200)}`);
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
