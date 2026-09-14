-- Migración: Añadir columna rut a registros_pendientes para capturar el RUT desde el QR
ALTER TABLE maquinaria.registros_pendientes
  ADD COLUMN IF NOT EXISTS rut TEXT;
