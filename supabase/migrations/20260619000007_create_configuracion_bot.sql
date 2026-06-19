-- Migración para crear la tabla de configuración del bot y almacenar de forma persistente su número de teléfono
CREATE TABLE IF NOT EXISTS maquinaria.configuracion_bot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar permisos para roles de Supabase (por si acaso RLS o acceso directo)
GRANT ALL PRIVILEGES ON TABLE maquinaria.configuracion_bot TO postgres, anon, authenticated, service_role;

-- Insertar el número por defecto del bot
INSERT INTO maquinaria.configuracion_bot (clave, valor)
VALUES ('bot_phone', '56951875221')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
