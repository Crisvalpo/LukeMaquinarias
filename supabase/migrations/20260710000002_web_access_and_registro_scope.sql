-- ============================================================
-- Formaliza personal.email (hoy solo existe via scratch/add_email_column.js),
-- amplia el CHECK de personal.rol para incluir 'Administrador',
-- y agrega proyecto_id a registros_pendientes para poder acotar
-- la gestion de solicitudes por proyecto (Jefe de Area vs Administrador General).
-- ============================================================

ALTER TABLE maquinaria.personal
    ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

ALTER TABLE maquinaria.personal
    DROP CONSTRAINT IF EXISTS personal_rol_check;

ALTER TABLE maquinaria.personal
    ADD CONSTRAINT personal_rol_check
    CHECK (rol IN ('Supervisor', 'Operador', 'Rigger', 'Jefe de Area', 'Administrador'));

ALTER TABLE maquinaria.registros_pendientes
    ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES maquinaria.proyectos(id);
