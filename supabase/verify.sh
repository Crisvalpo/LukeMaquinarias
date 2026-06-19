#!/bin/bash
echo "=== SCHEMA MAQUINARIA - TABLAS ==="
docker exec supabase-db psql -U postgres -d postgres -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'maquinaria' ORDER BY tablename;"

echo ""
echo "=== STORAGE BUCKET ==="
docker exec supabase-db psql -U postgres -d postgres -c "SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'evidencias-montaje';"

echo ""
echo "=== ESPECIALIDADES SEED ==="
docker exec supabase-db psql -U postgres -d postgres -c "SELECT nombre_oficial FROM maquinaria.especialidades ORDER BY nombre_oficial;"
