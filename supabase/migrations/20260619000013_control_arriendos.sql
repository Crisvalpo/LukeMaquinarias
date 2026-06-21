-- Migración: Agregar columnas para control de arriendo activo
-- Registra a quién se le arrendó y por cuánto tiempo

ALTER TABLE maquinaria.equipos 
ADD COLUMN IF NOT EXISTS arriendo_cliente TEXT,
ADD COLUMN IF NOT EXISTS arriendo_fecha_inicio DATE,
ADD COLUMN IF NOT EXISTS arriendo_fecha_fin DATE;
