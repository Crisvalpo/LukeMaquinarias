-- Nuevo estado de espera para confirmar el cierre de un turno anormalmente largo
-- (guardrail que valida horómetro/odómetro contra el tiempo real transcurrido)

ALTER TABLE maquinaria.sesiones_whatsapp DROP CONSTRAINT sesiones_whatsapp_estado_espera_check;
ALTER TABLE maquinaria.sesiones_whatsapp ADD CONSTRAINT sesiones_whatsapp_estado_espera_check
  CHECK (estado_espera = ANY (ARRAY[
    'ESPERANDO_CHECKIN_AUDIO',
    'SESION_ABIERTA_INTERMEDIA',
    'ESPERANDO_CHECKOUT_AUDIO',
    'ESPERANDO_CHECKOUT_PLATAFORMA',
    'ESPERANDO_CHECKOUT_PLATAFORMA_DETALLE',
    'ESPERANDO_CONFIRMACION_TURNO_LARGO'
  ]));
