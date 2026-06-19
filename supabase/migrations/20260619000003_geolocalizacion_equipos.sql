-- ============================================================
-- MIGRACIÓN 3: Geolocalización de Equipos en Faena
-- LukeMontaje - Schema maquinaria
-- ============================================================

-- 1. Agregar campos de geolocalización a la tabla de equipos
ALTER TABLE maquinaria.equipos ADD COLUMN latitud_actual DOUBLE PRECISION;
ALTER TABLE maquinaria.equipos ADD COLUMN longitud_actual DOUBLE PRECISION;
ALTER TABLE maquinaria.equipos ADD COLUMN ultima_ubicacion_fecha TIMESTAMP WITH TIME ZONE;

-- Coordenadas base: Taller de Equipos Echeverria Izquierdo (-33.6129369, -70.7164499)
UPDATE maquinaria.equipos
SET 
  latitud_actual = -33.6129369 + (random() * 0.002 - 0.001),
  longitud_actual = -70.7164499 + (random() * 0.002 - 0.001),
  ultima_ubicacion_fecha = now() - (random() * interval '4 hours')
WHERE id IN (
  SELECT id FROM maquinaria.equipos LIMIT 3
);
