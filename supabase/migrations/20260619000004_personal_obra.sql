-- Asociar personal a obras/proyectos directamente
ALTER TABLE maquinaria.personal ADD COLUMN obra_actual_id UUID REFERENCES maquinaria.obras(id);
