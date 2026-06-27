-- Migración: agregar columna color a maquinaria.especialidades
-- y asignar paleta fija a las especialidades del sector montaje industrial

ALTER TABLE maquinaria.especialidades
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6b7280';

-- Asignar colores corporativos por especialidad
UPDATE maquinaria.especialidades SET color = '#3b82f6' WHERE nombre_oficial = 'Piping';           -- Azul
UPDATE maquinaria.especialidades SET color = '#10b981' WHERE nombre_oficial = 'Estructuras';      -- Verde esmeralda
UPDATE maquinaria.especialidades SET color = '#f59e0b' WHERE nombre_oficial = 'Obras Civiles';    -- Ámbar
UPDATE maquinaria.especialidades SET color = '#f97316' WHERE nombre_oficial = 'Electricidad';     -- Naranja
UPDATE maquinaria.especialidades SET color = '#8b5cf6' WHERE nombre_oficial = 'Instrumentación';  -- Violeta
UPDATE maquinaria.especialidades SET color = '#ef4444' WHERE nombre_oficial = 'Izaje Especial';   -- Rojo
UPDATE maquinaria.especialidades SET color = '#06b6d4' WHERE nombre_oficial = 'Mantenimiento';    -- Cyan

-- Permitir a todos los roles ver y actualizar el color
GRANT UPDATE (color) ON TABLE maquinaria.especialidades TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';
