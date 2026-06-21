-- Migración: Agregar columna combustible_nivel_porcentaje a la tabla de equipos
-- Ejecutar en la base de datos Supabase

ALTER TABLE maquinaria.equipos 
ADD COLUMN IF NOT EXISTS combustible_nivel_porcentaje NUMERIC DEFAULT 100;
