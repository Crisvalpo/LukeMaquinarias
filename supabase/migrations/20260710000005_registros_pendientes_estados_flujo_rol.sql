-- ============================================================
-- registroHandler.js (commit 024c14b) introdujo un flujo conversacional
-- de seleccion de rol usando los estados 'esperando_nombre' y
-- 'esperando_rol', pero el CHECK constraint de registros_pendientes.estado
-- nunca se actualizo para permitirlos -- cualquier registro nuevo por
-- WhatsApp fallaba en el primer INSERT (estado='esperando_nombre').
-- ============================================================

ALTER TABLE maquinaria.registros_pendientes
    DROP CONSTRAINT IF EXISTS registros_pendientes_estado_check;

ALTER TABLE maquinaria.registros_pendientes
    ADD CONSTRAINT registros_pendientes_estado_check
    CHECK (estado IN ('esperando_nombre', 'esperando_rol', 'pendiente', 'aprobado', 'rechazado'));
