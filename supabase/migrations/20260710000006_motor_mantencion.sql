-- ============================================================
-- Motor de Salud del Activo: perfil de mantenimiento por equipo
-- (umbrales PM1-PM4 en horometro o kilometraje, segun tipo_seguimiento)
-- y registro de PM ejecutadas para calcular la "proxima PM".
-- Los umbrales son nullable: un equipo sin perfil configurado
-- (ej. torre de iluminacion) simplemente no participa del calculo.
-- ============================================================

ALTER TABLE maquinaria.equipos
    ADD COLUMN pm1_umbral NUMERIC,
    ADD COLUMN pm2_umbral NUMERIC,
    ADD COLUMN pm3_umbral NUMERIC,
    ADD COLUMN pm4_umbral NUMERIC,
    ADD COLUMN tolerancia_pm NUMERIC;

CREATE TABLE maquinaria.mantenciones_ejecutadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES maquinaria.equipos(id),
    tipo_pm TEXT NOT NULL CHECK (tipo_pm IN ('PM1', 'PM2', 'PM3', 'PM4')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    lectura_al_momento NUMERIC NOT NULL,
    responsable_id UUID REFERENCES maquinaria.personal(id),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN maquinaria.equipos.pm1_umbral IS 'Umbral PM1 en horas (horometro) o km (odometro), segun tipo_seguimiento del equipo.';
COMMENT ON COLUMN maquinaria.mantenciones_ejecutadas.lectura_al_momento IS 'Horometro u odometro del equipo al momento de ejecutar esta PM (mismo criterio que tipo_seguimiento).';
