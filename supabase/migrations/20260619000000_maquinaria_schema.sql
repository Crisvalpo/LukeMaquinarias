-- ============================================================
-- SCHEMA MAQUINARIA - LukeMontaje MVP
-- Sistema de Control Operacional por Voz y Gestión de Maquinaria Pesada
-- Ejecutar en la instancia Supabase self-hosted (~/supabase-docker)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS maquinaria;

-- ============================================================
-- 1. TABLA DE PROYECTOS / OBRAS
-- ============================================================
CREATE TABLE maquinaria.obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_obra TEXT NOT NULL,
    codigo_cc TEXT UNIQUE NOT NULL,
    ubicacion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. TABLA MAESTRA DE ESPECIALIDADES
-- ============================================================
CREATE TABLE maquinaria.especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_oficial TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Semilla inicial de especialidades del sector montaje industrial
INSERT INTO maquinaria.especialidades (nombre_oficial, descripcion) VALUES
    ('Piping', 'Montaje de tuberías, líneas y cañerías industriales'),
    ('Estructuras', 'Montaje de estructuras metálicas, vigas y soportes'),
    ('Obras Civiles', 'Excavaciones, fundaciones y obras de hormigón'),
    ('Electricidad', 'Tendido eléctrico, tableros y conexiones'),
    ('Instrumentación', 'Instalación de instrumentos de medición y control'),
    ('Izaje Especial', 'Maniobras de izaje de alta complejidad y tonelaje'),
    ('Mantenimiento', 'Mantenimiento preventivo y correctivo de equipos');

-- ============================================================
-- 3. TABLA MAESTRA DE PERSONAL Y ROLES
-- ============================================================
CREATE TABLE maquinaria.personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    whatsapp TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('Supervisor', 'Operador', 'Rigger', 'Jefe de Area')),
    turno_tipo TEXT DEFAULT '14x14',
    jornada_tipo TEXT DEFAULT 'Dia' CHECK (jornada_tipo IN ('Dia', 'Noche')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 4. TABLA DE EQUIPOS Y MAQUINARIA
-- ============================================================
CREATE TABLE maquinaria.equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_interno TEXT UNIQUE NOT NULL,
    descripcion_equipo TEXT NOT NULL,
    proveedor TEXT NOT NULL DEFAULT 'EIMISA',
    obra_actual_id UUID REFERENCES maquinaria.obras(id),
    estado_actual TEXT DEFAULT 'Disponible' CHECK (
        estado_actual IN ('Equipo Operativo', 'Disponible', 'En Colacion', 'Detenido por Falla')
    ),
    pauta_preventiva_activa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 5. TABLA PRINCIPAL DE REPORTES DIARIOS
-- ============================================================
CREATE TABLE maquinaria.reportes_diarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID REFERENCES maquinaria.equipos(id) NOT NULL,
    operador_id UUID REFERENCES maquinaria.personal(id) NOT NULL,
    supervisor_id UUID REFERENCES maquinaria.personal(id),
    rigger_id UUID REFERENCES maquinaria.personal(id),
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    horometro_inicio NUMERIC NOT NULL,
    horometro_final NUMERIC,
    horas_trabajadas NUMERIC GENERATED ALWAYS AS (
        CASE WHEN horometro_final IS NOT NULL THEN horometro_final - horometro_inicio ELSE NULL END
    ) STORED,
    petroleo_litros NUMERIC DEFAULT 0,
    horometro_carga_combustible NUMERIC,
    estado_final TEXT DEFAULT 'Equipo Operativo',
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unica_jornada_equipo UNIQUE (equipo_id, operador_id, fecha)
);

-- ============================================================
-- 6. TABLA DE LÍNEA DE TIEMPO INTERMEDIA (HITOS DEL DÍA)
-- ============================================================
CREATE TABLE maquinaria.eventos_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporte_id UUID REFERENCES maquinaria.reportes_diarios(id) ON DELETE CASCADE,
    estado_hito TEXT NOT NULL CHECK (
        estado_hito IN ('Trabajando', 'Disponible', 'En Colacion', 'Detenido por Falla')
    ),
    especialidad_id UUID REFERENCES maquinaria.especialidades(id),
    hora_evento TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    nota_transcripcion TEXT
);

-- ============================================================
-- 7. TABLA DE EVIDENCIAS FOTOGRÁFICAS
-- ============================================================
CREATE TABLE maquinaria.evidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporte_id UUID REFERENCES maquinaria.reportes_diarios(id) ON DELETE CASCADE,
    evento_id UUID REFERENCES maquinaria.eventos_jornada(id) ON DELETE CASCADE,
    local_storage_path TEXT NOT NULL,
    descripcion_analisis_ia TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 8. SESIONES DE CONTROL DE ESTADO DE WHATSAPP (STATE MACHINE)
-- ============================================================
CREATE TABLE maquinaria.sesiones_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_remitente TEXT UNIQUE NOT NULL,
    reporte_activo_id UUID REFERENCES maquinaria.reportes_diarios(id),
    estado_espera TEXT NOT NULL CHECK (
        estado_espera IN (
            'ESPERANDO_CHECKIN_AUDIO',
            'SESION_ABIERTA_INTERMEDIA',
            'ESPERANDO_CHECKOUT_AUDIO'
        )
    ),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- TRIGGER: Actualizar estado del equipo al insertar un hito
-- ============================================================
CREATE OR REPLACE FUNCTION maquinaria.actualizar_estado_equipo()
RETURNS TRIGGER AS $$
DECLARE
    v_equipo_id UUID;
    v_nuevo_estado TEXT;
BEGIN
    -- Obtener el equipo_id desde el reporte
    SELECT equipo_id INTO v_equipo_id
    FROM maquinaria.reportes_diarios
    WHERE id = NEW.reporte_id;

    -- Mapear estado_hito al estado del equipo
    v_nuevo_estado := CASE NEW.estado_hito
        WHEN 'Trabajando' THEN 'Equipo Operativo'
        WHEN 'Disponible' THEN 'Disponible'
        WHEN 'En Colacion' THEN 'En Colacion'
        WHEN 'Detenido por Falla' THEN 'Detenido por Falla'
        ELSE 'Disponible'
    END;

    -- Mutar el estado actual del equipo
    UPDATE maquinaria.equipos
    SET estado_actual = v_nuevo_estado
    WHERE id = v_equipo_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_estado_equipo
AFTER INSERT ON maquinaria.eventos_jornada
FOR EACH ROW
EXECUTE FUNCTION maquinaria.actualizar_estado_equipo();

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_sesiones_wa ON maquinaria.sesiones_whatsapp(whatsapp_remitente);
CREATE INDEX idx_reportes_fecha ON maquinaria.reportes_diarios(fecha, equipo_id);
CREATE INDEX idx_eventos_reporte ON maquinaria.eventos_jornada(reporte_id, hora_evento);
CREATE INDEX idx_personal_whatsapp ON maquinaria.personal(whatsapp);
CREATE INDEX idx_equipos_codigo ON maquinaria.equipos(codigo_interno);

-- ============================================================
-- RLS: Desactivado en schema maquinaria (acceso via service_role)
-- ============================================================
ALTER TABLE maquinaria.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.reportes_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.eventos_jornada ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.sesiones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política: solo el service_role puede acceder (bypass RLS desde el backend)
-- El frontend nunca accede a Supabase directamente, siempre via API routes de Next.js
