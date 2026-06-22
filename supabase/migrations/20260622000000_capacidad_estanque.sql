-- Migración para agregar la capacidad del estanque de combustible a los equipos
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS capacidad_estanque_litros INTEGER;
