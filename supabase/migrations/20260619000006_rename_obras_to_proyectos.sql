-- 1. Renombrar la tabla principal
ALTER TABLE maquinaria.obras RENAME TO proyectos;

-- 2. Renombrar la columna de nombre de la obra en la nueva tabla
ALTER TABLE maquinaria.proyectos RENAME COLUMN nombre_obra TO nombre_proyecto;

-- 3. Renombrar las columnas de claves foráneas en las tablas dependientes
ALTER TABLE maquinaria.personal RENAME COLUMN obra_actual_id TO proyecto_actual_id;
ALTER TABLE maquinaria.equipos RENAME COLUMN obra_actual_id TO proyecto_actual_id;
