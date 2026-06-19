-- 1. Normalizar la categoría maestra 'GRÚAS' y corregir cualquier codificación corrupta
UPDATE maquinaria.equipos
SET categoria = 'GRÚAS'
WHERE categoria LIKE 'GR%AS%' OR categoria LIKE 'GR%as%' OR categoria = 'GR??AS';

-- 2. Clasificar los 19 equipos vacíos/nulos

-- GRTA-0001: Grúa Torre Automontable
UPDATE maquinaria.equipos
SET tipo = 'GRUAS TORRES', categoria = 'GRÚAS'
WHERE codigo_interno = 'GRTA-0001';

-- MDLF-0001 a MDLF-0005: Spreader Modulift (accesorios de izaje)
UPDATE maquinaria.equipos
SET tipo = 'ACCESORIOS DE IZAJE', categoria = 'EQUIPOS MENORES'
WHERE codigo_interno LIKE 'MDLF-%';

-- RAMP-0009 a RAMP-0013: Semirremolques / Ramplas
UPDATE maquinaria.equipos
SET tipo = 'RAMPLAS', categoria = 'CAMIONES'
WHERE codigo_interno LIKE 'RAMP-%';

-- TMFS-0001 y TMFS-0002: Termofusionadoras
UPDATE maquinaria.equipos
SET tipo = 'TERMOFUSIONADORAS', categoria = 'EQUIPOS MENORES'
WHERE codigo_interno LIKE 'TMFS-%';

-- TRAC-0012 y TRAC-0013: Tractocamiones Mack
UPDATE maquinaria.equipos
SET tipo = 'TRACTO CAMIONES', categoria = 'CAMIONES'
WHERE codigo_interno IN ('TRAC-0012', 'TRAC-0013');

-- TRAC-0014, TRAC-0015, TRAC-0016: Tractocamión Pluma Renault
UPDATE maquinaria.equipos
SET tipo = 'CAMIONES PLUMA', categoria = 'CAMIONES'
WHERE codigo_interno IN ('TRAC-0014', 'TRAC-0015', 'TRAC-0016');

-- VCLF-0001: Vacuum Lift
UPDATE maquinaria.equipos
SET tipo = 'VACUUM LIFTS', categoria = 'EQUIPOS MENORES'
WHERE codigo_interno = 'VCLF-0001';

-- 3. Normalizaciones adicionales para asegurar homogeneidad al 100%
UPDATE maquinaria.equipos
SET categoria = 'CAMIONES'
WHERE tipo = 'CAMIONES PLUMA' AND (categoria IS NULL OR categoria != 'CAMIONES');

UPDATE maquinaria.equipos
SET categoria = 'VEHÍCULOS MENORES'
WHERE tipo = 'CAMIONETAS' AND (categoria IS NULL OR categoria != 'VEHÍCULOS MENORES');

UPDATE maquinaria.equipos
SET categoria = 'EQUIPOS MENORES'
WHERE tipo IN ('GENERADORES ELECTRICOS', 'TORRES DE ILUMINACION', 'COMPRESORES DE AIRE') AND (categoria IS NULL OR categoria != 'EQUIPOS MENORES');

-- 4. Mostrar el reporte consolidado final para verificar las 6 categorías
SELECT categoria, COUNT(*), COUNT(*) FILTER (WHERE tipo IS NULL OR tipo = '') as sin_tipo 
FROM maquinaria.equipos 
GROUP BY categoria 
ORDER BY 2 DESC;
