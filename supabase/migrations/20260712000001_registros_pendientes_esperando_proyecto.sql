-- Nuevo estado intermedio: el auto-registro ahora pregunta el proyecto en un paso
-- separado del nombre, en vez de depender de que el usuario use la convencion
-- "Nombre_CODIGO" (causa raiz de la confusion de nombre/proyecto con Narkis Rodriguez).

ALTER TABLE maquinaria.registros_pendientes DROP CONSTRAINT registros_pendientes_estado_check;
ALTER TABLE maquinaria.registros_pendientes ADD CONSTRAINT registros_pendientes_estado_check
  CHECK (estado = ANY (ARRAY[
    'esperando_nombre',
    'esperando_proyecto',
    'esperando_rol',
    'pendiente',
    'aprobado',
    'rechazado'
  ]));
