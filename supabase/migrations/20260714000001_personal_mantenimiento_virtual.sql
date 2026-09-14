-- Migración: Crear identidades de sistema para participantes virtuales de Mantenimiento y Taller en Sala POD
INSERT INTO maquinaria.personal (id, rut, nombre_completo, whatsapp, rol, especialidad_id, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'MANT-001', 'Mantenimiento Preventivo', '56900000001', 'Supervisor', '9d2f21fd-791c-4746-8cee-df5f57f3532a', true),
  ('22222222-2222-2222-2222-222222222222', 'MANT-002', 'Taller / Reparación', '56900000002', 'Supervisor', '9d2f21fd-791c-4746-8cee-df5f57f3532a', true)
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  especialidad_id = EXCLUDED.especialidad_id,
  activo = true;
