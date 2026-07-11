-- ============================================================
-- Caracteristicas operacionales configurables por equipo: hoy el bot
-- pregunta lo mismo a todos los equipos al cerrar jornada (ej. estado
-- de plataforma Cargada/Limpia) sin importar si aplica o no. Se agrega
-- un flag concreto para el caso identificado: las gruas no deberian
-- recibir esa pregunta.
-- ============================================================

ALTER TABLE maquinaria.equipos
    ADD COLUMN usa_plataforma BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN maquinaria.equipos.usa_plataforma IS 'Si es false, el bot no pregunta el estado de plataforma (Cargada/Limpia) al cerrar jornada de este equipo.';

-- Corrige el caso concreto: las gruas no manejan estado de plataforma.
UPDATE maquinaria.equipos SET usa_plataforma = false WHERE categoria = 'GRÚAS';
