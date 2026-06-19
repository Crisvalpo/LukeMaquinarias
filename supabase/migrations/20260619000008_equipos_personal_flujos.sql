-- Migración: Agregar campo foto_url a personal y flujo_tipo a equipos
-- Ejecutar en la base de datos Supabase

ALTER TABLE maquinaria.personal ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS flujo_tipo TEXT DEFAULT 'ESTANDAR';
