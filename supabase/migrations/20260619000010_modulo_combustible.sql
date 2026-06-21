-- Migración: Módulo de Gestión y Control de Combustible Inteligente
-- Ejecutar en la base de datos Supabase

-- 1. Extender reportes diarios para almacenar estados de combustible de la jornada
ALTER TABLE maquinaria.reportes_diarios 
ADD COLUMN IF NOT EXISTS combustible_inicio_porcentaje NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS combustible_final_porcentaje NUMERIC,
ADD COLUMN IF NOT EXISTS combustible_nivel_porcentaje NUMERIC DEFAULT 100;

-- 2. Registrar el nivel de combustible capturado en cada hito intermedio
ALTER TABLE maquinaria.eventos_jornada 
ADD COLUMN IF NOT EXISTS combustible_nivel_momento NUMERIC;

-- 3. Crear tabla para el registro analítico de vouchers externos (Rendición de Cuentas)
CREATE TABLE IF NOT EXISTS maquinaria.vouchers_combustible (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reporte_diario UUID REFERENCES maquinaria.reportes_diarios(id) ON DELETE CASCADE,
    id_personal UUID REFERENCES maquinaria.personal(id),
    servicentro TEXT,                  -- Ej: COPEC, SHELL
    monto_pesos INT,
    litros_cargados NUMERIC,
    numero_boleta TEXT,
    storage_path_evidencia TEXT,        -- Enlace al bucket de storage
    fecha_carga DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
