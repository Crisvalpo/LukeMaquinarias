-- Migración para añadir metadatos reales de los equipos en maquinaria.equipos
ALTER TABLE maquinaria.equipos 
ADD COLUMN patente TEXT,
ADD COLUMN marca TEXT,
ADD COLUMN modelo TEXT,
ADD COLUMN numero_serial TEXT,
ADD COLUMN tipo TEXT,
ADD COLUMN categoria TEXT,
ADD COLUMN anio_fabricacion INTEGER;
