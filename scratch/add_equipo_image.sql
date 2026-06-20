-- ============================================================
-- MIGRACIÓN: AGREGAR IMAGEN DE FONDO A EQUIPOS Y BUCKET STORAGE
-- ============================================================

-- 1. Agregar columna imagen_url si no existe
ALTER TABLE maquinaria.equipos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 2. Crear el bucket público para imágenes de equipos en Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'imagenes-equipos',
    'imagenes-equipos',
    true,                                  -- Público: accesible directamente via URL
    15728640,                              -- 15 MB max por archivo
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear política de lectura pública para el bucket imagenes-equipos
-- Esto asegura que Supabase Storage sirva los archivos sin necesidad de tokens firmados temporales.
CREATE POLICY "Acceso publico lectura para imagenes-equipos"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagenes-equipos');
