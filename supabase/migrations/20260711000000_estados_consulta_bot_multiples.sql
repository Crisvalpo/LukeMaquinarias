-- Permite múltiples confirmaciones de actividad POD pendientes por supervisor
-- (antes, telefono_supervisor era UNIQUE y una segunda pregunta pisaba la primera)

ALTER TABLE maquinaria.estados_consulta_bot DROP CONSTRAINT estados_consulta_bot_telefono_supervisor_key;
ALTER TABLE maquinaria.estados_consulta_bot ADD CONSTRAINT estados_consulta_bot_planificacion_id_key UNIQUE (planificacion_id);

ALTER TABLE maquinaria.estados_consulta_bot
  ADD COLUMN esperando_confirmacion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN respuesta_interpretada JSONB;
