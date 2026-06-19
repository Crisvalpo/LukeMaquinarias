-- ============================================================
-- MIGRACIÓN 2: Tools Dinámicas + Registro de Usuarios
-- LukeMontaje - Schema maquinaria
-- ============================================================

-- ============================================================
-- 1. TABLA BOT_TOOLS_DINÁMICAS (mismo patrón que LukeDelivery)
--    Permite a Supervisores crear consultas SQL en caliente vía IA
-- ============================================================
CREATE TABLE maquinaria.bot_tools_dinamicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_funcion TEXT UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    codigo_javascript TEXT NOT NULL,
    esquema_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. TABLA REGISTROS_PENDIENTES
--    Auto-registro desde WhatsApp. El admin aprueba desde el panel.
-- ============================================================
CREATE TABLE maquinaria.registros_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    rol_solicitado TEXT DEFAULT 'Operador' CHECK (
        rol_solicitado IN ('Operador', 'Supervisor', 'Rigger', 'Jefe de Area')
    ),
    estado TEXT DEFAULT 'pendiente' CHECK (
        estado IN ('pendiente', 'aprobado', 'rechazado')
    ),
    nota_rechazo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
CREATE INDEX idx_tools_nombre ON maquinaria.bot_tools_dinamicas(nombre_funcion);
CREATE INDEX idx_registros_wa ON maquinaria.registros_pendientes(whatsapp);
CREATE INDEX idx_registros_estado ON maquinaria.registros_pendientes(estado);

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE maquinaria.bot_tools_dinamicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.registros_pendientes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. SEEDS: Tools básicas de consulta para Supervisores
-- ============================================================
INSERT INTO maquinaria.bot_tools_dinamicas (nombre_funcion, descripcion, codigo_javascript, esquema_json)
VALUES
(
  'consultar_estado_equipos',
  'Retorna el estado actual de todos los equipos registrados en faena con su operador activo del día.',
  'const { data, error } = await supabase.from("equipos").select("codigo_interno, descripcion_equipo, estado_actual, proveedor, obras(nombre_obra)"); if (error) throw error; return data;',
  '{"type": "OBJECT", "properties": {}}'
),
(
  'consultar_reportes_hoy',
  'Retorna todos los reportes de jornada del día actual con horómetros y estado.',
  'const hoy = new Date().toISOString().slice(0, 10); const { data, error } = await supabase.from("reportes_diarios").select("fecha, horometro_inicio, horometro_final, horas_trabajadas, petroleo_litros, equipos(codigo_interno, descripcion_equipo), personal!operador_id(nombre_completo)").eq("fecha", hoy); if (error) throw error; return data;',
  '{"type": "OBJECT", "properties": {}}'
),
(
  'consultar_equipos_con_falla',
  'Retorna únicamente los equipos que están actualmente en estado Detenido por Falla.',
  'const { data, error } = await supabase.from("equipos").select("codigo_interno, descripcion_equipo, proveedor, obras(nombre_obra)").eq("estado_actual", "Detenido por Falla"); if (error) throw error; return data;',
  '{"type": "OBJECT", "properties": {}}'
),
(
  'consultar_personal_activo',
  'Retorna la lista del personal activo registrado en el sistema con su rol y turno.',
  'const { data, error } = await supabase.from("personal").select("nombre_completo, whatsapp, rol, turno_tipo, jornada_tipo").eq("activo", true).order("rol"); if (error) throw error; return data;',
  '{"type": "OBJECT", "properties": {}}'
);
