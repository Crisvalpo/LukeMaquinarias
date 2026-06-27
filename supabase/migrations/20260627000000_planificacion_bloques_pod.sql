-- ============================================================
-- MIGRACIÓN: Sistema POD Dinámico por Bloques Horarios
-- ============================================================

-- 1. Agregar columnas a maquinaria.equipos para control de plataformas cargadas
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS plataforma_estado TEXT DEFAULT 'Limpia' CHECK (plataforma_estado IN ('Cargada', 'Limpia'));
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS plataforma_especialidad_id UUID REFERENCES maquinaria.especialidades(id) ON DELETE SET NULL;
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS plataforma_detalle TEXT;

-- 2. Agregar columna especialidad_id a la tabla de personal
ALTER TABLE maquinaria.personal ADD COLUMN IF NOT EXISTS especialidad_id UUID REFERENCES maquinaria.especialidades(id) ON DELETE SET NULL;

-- 3. Crear tabla de participación de supervisores en el POD matutino
CREATE TABLE IF NOT EXISTS maquinaria.participacion_pod (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    personal_id UUID NOT NULL REFERENCES maquinaria.personal(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unica_participacion UNIQUE (fecha, personal_id)
);

-- 4. Crear tabla de planificación de bloques del POD
CREATE TABLE IF NOT EXISTS maquinaria.planificacion_bloques_pod (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    equipo_id UUID NOT NULL REFERENCES maquinaria.equipos(id) ON DELETE CASCADE,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    especialidad_id UUID NOT NULL REFERENCES maquinaria.especialidades(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES maquinaria.personal(id) ON DELETE CASCADE,
    actividad_especifica TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT chk_horas CHECK (hora_inicio < hora_fin)
);

-- Disparador de exclusión horaria para evitar solapamientos de bloques para el mismo equipo en la misma fecha
CREATE OR REPLACE FUNCTION maquinaria.check_overlap_planificacion_bloques_pod()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM maquinaria.planificacion_bloques_pod
        WHERE equipo_id = NEW.equipo_id
          AND fecha = NEW.fecha
          AND id <> NEW.id
          AND NOT (NEW.hora_fin <= hora_inicio OR NEW.hora_inicio >= hora_fin)
    ) THEN
        RAISE EXCEPTION 'Exclusión horaria: El equipo ya se encuentra asignado a un bloque que se solapa con el rango ingresado.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_check_overlap_planificacion_bloques_pod
BEFORE INSERT OR UPDATE ON maquinaria.planificacion_bloques_pod
FOR EACH ROW EXECUTE FUNCTION maquinaria.check_overlap_planificacion_bloques_pod();

-- 5. Modificar restricciones de sesiones_whatsapp para dar soporte al cierre de plataforma
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'maquinaria'
          AND rel.relname = 'sesiones_whatsapp'
          AND con.contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE maquinaria.sesiones_whatsapp DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

ALTER TABLE maquinaria.sesiones_whatsapp ADD CONSTRAINT sesiones_whatsapp_estado_espera_check 
    CHECK (estado_espera IN ('ESPERANDO_CHECKIN_AUDIO', 'SESION_ABIERTA_INTERMEDIA', 'ESPERANDO_CHECKOUT_AUDIO', 'ESPERANDO_CHECKOUT_PLATAFORMA', 'ESPERANDO_CHECKOUT_PLATAFORMA_DETALLE'));

-- 6. Crear tabla de Estados de Consulta del Bot (sesión temporal para supervisores)
CREATE TABLE IF NOT EXISTS maquinaria.estados_consulta_bot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono_supervisor TEXT UNIQUE NOT NULL,
    planificacion_id UUID NOT NULL REFERENCES maquinaria.planificacion_bloques_pod(id) ON DELETE CASCADE,
    evento_operador_id UUID REFERENCES maquinaria.eventos_jornada(id) ON DELETE SET NULL,
    estado_pregunta TEXT NOT NULL CHECK (estado_pregunta IN ('Pendiente_Actividad', 'Procesado')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE maquinaria.participacion_pod ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.planificacion_bloques_pod ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinaria.estados_consulta_bot ENABLE ROW LEVEL SECURITY;

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_planificacion_pod_fecha ON maquinaria.planificacion_bloques_pod(fecha, equipo_id);
CREATE INDEX IF NOT EXISTS idx_participacion_pod_fecha ON maquinaria.participacion_pod(fecha);
CREATE INDEX IF NOT EXISTS idx_estados_consulta_bot_tel ON maquinaria.estados_consulta_bot(telefono_supervisor);
