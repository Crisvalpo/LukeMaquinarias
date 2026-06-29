-- ============================================================
-- POD Sesión: Participantes en tiempo real
-- Tabla para registrar supervisores que se unen a una sesión POD
-- ============================================================
CREATE TABLE IF NOT EXISTS maquinaria.pod_sesion_participantes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  proyecto_id UUID REFERENCES maquinaria.proyectos(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES maquinaria.personal(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT pod_sesion_unique UNIQUE(fecha, proyecto_id, personal_id)
);

-- Índice para consultas por fecha + proyecto (polling frecuente)
CREATE INDEX IF NOT EXISTS idx_pod_sesion_fecha_proyecto
  ON maquinaria.pod_sesion_participantes(fecha, proyecto_id);

-- Limpieza automática: eliminar participantes de sesiones > 3 días
-- (se puede ejecutar manualmente o via cron en n8n)
-- DELETE FROM maquinaria.pod_sesion_participantes WHERE fecha < now()::date - 3;
