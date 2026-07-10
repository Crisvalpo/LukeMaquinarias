-- ============================================================
-- Migracion: Flujo POD dia siguiente - confirmacion operador
-- ============================================================
ALTER TABLE planificacion_bloques_pod
  ADD COLUMN IF NOT EXISTS confirmado_at           timestamptz,
  ADD COLUMN IF NOT EXISTS operador_confirmador_id uuid REFERENCES personal(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actividad_respondida_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bloques_pod_fecha_equipo
  ON planificacion_bloques_pod (fecha, equipo_id);

CREATE INDEX IF NOT EXISTS idx_bloques_pod_fecha_supervisor
  ON planificacion_bloques_pod (fecha, supervisor_id);

COMMENT ON COLUMN planificacion_bloques_pod.confirmado_at
  IS 'Timestamp en que el operador confirmo la asignacion al hacer check-in del equipo';

COMMENT ON COLUMN planificacion_bloques_pod.operador_confirmador_id
  IS 'Operador que tomo el equipo ese dia (vinculado al confirmar via QR check-in)';

COMMENT ON COLUMN planificacion_bloques_pod.actividad_respondida_at
  IS 'Timestamp en que el supervisor respondio la pregunta de actividad via WhatsApp';
