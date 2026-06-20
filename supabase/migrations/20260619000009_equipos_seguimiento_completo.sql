-- Migración: Agregar columna seguimiento_completo a equipos
-- Ejecutar en la base de datos Supabase

ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS seguimiento_completo BOOLEAN DEFAULT TRUE;

-- Migrar datos de flujo_tipo (si existía en la ejecución previa)
UPDATE maquinaria.equipos 
SET seguimiento_completo = FALSE 
WHERE flujo_tipo = 'TORRE_ILUMINACION';
