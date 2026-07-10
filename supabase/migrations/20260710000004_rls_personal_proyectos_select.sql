-- ============================================================
-- personal y proyectos tienen RLS habilitado desde el schema original
-- pero sin ninguna politica: cualquier consulta hecha desde el navegador
-- (clave anon, sujeta a RLS) siempre devuelve vacio, sin importar el filtro.
-- Esto rompe la resolucion de identidad en AdminAuthWrapper.jsx para
-- cualquier login por correo (ademas del caso hardcodeado).
-- Se agregan politicas minimas de solo lectura: cada usuario autenticado
-- puede leer unicamente su propia fila de personal (por email), y
-- proyectos queda de solo lectura para cualquier autenticado (dato no sensible).
-- ============================================================

CREATE POLICY personal_select_own ON maquinaria.personal
    FOR SELECT
    TO authenticated
    USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY proyectos_select_authenticated ON maquinaria.proyectos
    FOR SELECT
    TO authenticated
    USING (true);
