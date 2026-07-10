-- =============================================================
-- Migracion: tareas_programadas por especialidad
-- =============================================================

CREATE TABLE IF NOT EXISTS maquinaria.tareas_programadas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  especialidad_id uuid REFERENCES maquinaria.especialidades(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  descripcion     text,
  codigo          text,
  activa          boolean NOT NULL DEFAULT true,
  orden           integer NOT NULL DEFAULT 0,
  es_libre        boolean NOT NULL DEFAULT false, -- true = placeholder "Otra actividad"
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tareas_especialidad_orden
  ON maquinaria.tareas_programadas (especialidad_id, activa, orden);

-- Campo para guardar la lista enviada al supervisor (para mapear respuesta numerica)
ALTER TABLE maquinaria.estados_consulta_bot
  ADD COLUMN IF NOT EXISTS tareas_enviadas jsonb,
  ADD COLUMN IF NOT EXISTS esperando_libre boolean NOT NULL DEFAULT false;

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON maquinaria.tareas_programadas TO service_role;
GRANT SELECT ON maquinaria.tareas_programadas TO authenticated;

COMMENT ON TABLE maquinaria.tareas_programadas
  IS 'Catalogo de tareas programadas por especialidad. Se ofrecen como respuestas rapidas al supervisor via WA.';

COMMENT ON COLUMN maquinaria.estados_consulta_bot.tareas_enviadas
  IS 'Array JSON de tareas enviadas al supervisor [{orden:1, nombre:"..."}, ...] para mapear respuesta numerica.';

COMMENT ON COLUMN maquinaria.estados_consulta_bot.esperando_libre
  IS 'true cuando el supervisor eligio 0 (otra actividad) y esperamos texto libre a continuacion.';

NOTIFY pgrst, 'reload schema';
