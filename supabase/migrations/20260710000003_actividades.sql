-- ============================================================
-- Introduce "actividad" como entidad de primera clase, en linea con
-- la vision Actividad -> Especialidad -> Cuadrilla -> Recursos -> Produccion.
-- Hoy la actividad es texto libre copiado entre tareas_programadas.nombre,
-- planificacion_bloques_pod.actividad_especifica y eventos_jornada.nota_transcripcion,
-- sin FK que los conecte. Esta migracion crea la tabla y los enlaces,
-- y hace un backfill best-effort de los bloques historicos.
-- ============================================================

CREATE TABLE maquinaria.actividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    proyecto_id UUID REFERENCES maquinaria.proyectos(id),
    especialidad_id UUID REFERENCES maquinaria.especialidades(id),
    tarea_programada_id UUID REFERENCES maquinaria.tareas_programadas(id),
    descripcion TEXT,
    programada BOOLEAN NOT NULL DEFAULT true,
    cantidad_planificada NUMERIC,
    unidad TEXT,
    cantidad_ejecutada NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE maquinaria.actividades IS 'Actividad como entidad central: especialidad + tarea de catalogo (o descripcion libre) + cantidad planificada/ejecutada. No incluye cuadrillas/HH (servicio externo aparte).';
COMMENT ON COLUMN maquinaria.actividades.programada IS 'true si estaba planificada de antemano (POD); false si fue reactiva/no programada (respuesta libre del supervisor).';

ALTER TABLE maquinaria.planificacion_bloques_pod
    ADD COLUMN actividad_id UUID REFERENCES maquinaria.actividades(id);

ALTER TABLE maquinaria.eventos_jornada
    ADD COLUMN actividad_id UUID REFERENCES maquinaria.actividades(id);

-- Backfill best-effort: cada bloque historico con actividad_especifica no vacio
-- obtiene su propia fila en actividades (matcheando tareas_programadas por nombre
-- cuando es posible). No se backfillea eventos_jornada.actividad_id: el texto de
-- nota_transcripcion es demasiado heterogeneo para matchear de forma confiable.
DO $$
DECLARE
    r RECORD;
    new_id UUID;
    matched_tarea_id UUID;
BEGIN
    FOR r IN
        SELECT b.id AS bloque_id, b.fecha, b.especialidad_id, b.actividad_especifica,
               e.proyecto_actual_id
        FROM maquinaria.planificacion_bloques_pod b
        LEFT JOIN maquinaria.equipos e ON e.id = b.equipo_id
        WHERE b.actividad_especifica IS NOT NULL
          AND btrim(b.actividad_especifica) <> ''
          AND b.actividad_id IS NULL
    LOOP
        SELECT tp.id INTO matched_tarea_id
        FROM maquinaria.tareas_programadas tp
        WHERE tp.especialidad_id IS NOT DISTINCT FROM r.especialidad_id
          AND tp.nombre = r.actividad_especifica
        LIMIT 1;

        INSERT INTO maquinaria.actividades (fecha, proyecto_id, especialidad_id, tarea_programada_id, descripcion, programada)
        VALUES (
            r.fecha,
            r.proyecto_actual_id,
            r.especialidad_id,
            matched_tarea_id,
            CASE WHEN matched_tarea_id IS NULL THEN r.actividad_especifica ELSE NULL END,
            NOT (r.actividad_especifica ILIKE '[NO PROGRAMADA]%')
        )
        RETURNING id INTO new_id;

        UPDATE maquinaria.planificacion_bloques_pod SET actividad_id = new_id WHERE id = r.bloque_id;

        matched_tarea_id := NULL;
    END LOOP;
END $$;
