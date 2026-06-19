-- ============================================================
-- BUCKET DE EVIDENCIAS EN SUPABASE STORAGE
-- Ejecutar después de la migración principal del schema maquinaria
-- ============================================================

-- Crear el bucket privado para evidencias fotográficas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidencias-montaje',
    'evidencias-montaje',
    false,                                  -- Privado: solo accesible via service_role
    10485760,                               -- 10 MB max por archivo
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: solo service_role puede operar (el backend bypasea RLS)
-- No necesitamos políticas adicionales ya que usamos service_role en el backend
-- El bucket es privado, los archivos se acceden via signed URLs temporales

-- ============================================================
-- ÍNDICE ADICIONAL EN EVIDENCIAS PARA BUSCAR POR STORAGE PATH
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_evidencias_storage 
ON maquinaria.evidencias(local_storage_path);
