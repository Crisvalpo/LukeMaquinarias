-- Migración: Agregar columna clasificacion_comercial a la tabla de equipos
-- Para control comercial (Arriendo, Venta, etc.)

ALTER TABLE maquinaria.equipos 
ADD COLUMN IF NOT EXISTS clasificacion_comercial TEXT DEFAULT 'OPERATIVO - EN USO';

CREATE INDEX IF NOT EXISTS idx_equipos_clasificacion ON maquinaria.equipos(clasificacion_comercial);
