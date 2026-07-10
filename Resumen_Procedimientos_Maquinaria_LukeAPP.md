# Resumen Procedimientos de Maquinaria y Prompt para Desarrollador LukeAPP

**Preparado para:** Cristian Luke Cabello  
**Fecha:** 10 de julio de 2026  
**Propósito:** entregar al desarrollador una lectura funcional y estratégica de los procedimientos asociados a maquinaria, operación, mantención, control de equipos, cuadrillas, actividades y generación documental automática dentro de la visión LukeAPP / LukeMaquinarias.

---

## 1. Idea central

LukeMaquinarias no debe entenderse como una aplicación de inventario ni como una app aislada de maquinaria. La visión correcta es que forme parte de LukeAPP como un sistema de captura operacional en tiempo real, donde la actividad ejecutada es el eje principal y la maquinaria, cuadrillas, operadores, riggers, evidencias y documentos son recursos o consecuencias de esa actividad.

El principio base es:

> **La actividad ocurre, los actores interactúan, el sistema captura datos estructurados y los documentos se generan automáticamente como consecuencia de la operación.**

Por lo tanto, el objetivo no es digitalizar formularios en papel, sino identificar qué documentos generan hoy los distintos actores, qué información contienen, quién la conoce en terreno y cómo capturarla por interacción natural para reconstruir esos documentos sin doble digitación.

---

## 2. Documentación asociada a maquinaria revisada

### 2.1 Procedimiento de Mantención de Vehículos y Maquinarias — 4600029434-03600-PROGC-00008_D

Este procedimiento define la mantención menor preventiva de vehículos y maquinarias dentro de obra. Su objetivo es establecer una metodología de trabajo segura, controlar riesgos, mantener disponibilidad y confiabilidad de la flota, y asegurar que la mantención se ejecute según requisitos legales, contractuales y del fabricante.

Puntos clave para LukeAPP:

- La mantención se debe programar por pauta preventiva.
- Existen pautas PM1, PM2, PM3 y PM4.
- La lógica de activación puede ser por horómetro o kilometraje.
- PM1: cada 250 horas o 10.000 km.
- PM2: cada 500 horas o 20.000 km.
- PM3: cada 1.000 horas o 40.000 km.
- PM4: cada 2.000 horas o 80.000 km.
- Se toleran desviaciones de aproximadamente ±50 horas para equipos controlados por horómetro y ±2.000 km para equipos con control por kilometraje.
- Antes de intervenir, se debe verificar la pauta, condición del equipo, herramientas, terreno firme/nivelado y condiciones para la mantención.
- La mantención no es solo técnica: también involucra seguridad, bloqueo, ART, controles críticos, evidencias y liberación.

Implicancia para el sistema:

LukeAPP debe tener un motor de mantenciones que determine cuándo corresponde PM1/PM2/PM3/PM4 según cada equipo, permita registrar ejecución, evidencias, observaciones, responsable, validación y liberación. No basta con registrar “mantención realizada”. Debe existir trazabilidad de programación, ejecución, control de seguridad y cierre.

---

### 2.2 Procedimiento de Mantención de Vehículos y Maquinaria — versión general

Este procedimiento rescata la estructura de responsabilidades entre administrador, jefe de maquinarias, supervisor, prevención, mecánicos y personal ejecutor. Refuerza que la mantención debe ser planificada, controlada, comunicada, registrada y ejecutada bajo condiciones seguras.

Puntos clave:

- El administrador debe proveer recursos y aprobar el procedimiento.
- El jefe de maquinarias debe planificar, programar, instruir, asignar recursos y registrar no conformidades.
- El supervisor debe dar a conocer el procedimiento, coordinar recursos y asegurar cumplimiento técnico y preventivo.
- Mecánicos y electromecánicos deben ejecutar conforme a pauta, identificar herramientas defectuosas, aplicar bloqueos y controlar riesgos.

Implicancia para el sistema:

Cada intervención debe estar asociada a roles. No todos los usuarios deben llenar lo mismo. El sistema debe saber qué rol captura qué dato y quién valida. Deben existir firmas o aprobaciones digitales equivalentes a “prepara / revisa / aprueba / toma conocimiento”.

---

### 2.3 EIM-PRO-OFT-001 — Control de Oficina Técnica de Obra

Este procedimiento es clave porque conecta maquinaria con planificación y productividad. No mira la maquinaria solo como activo, sino como recurso de obra que debe ser programado, utilizado y controlado.

Puntos clave:

- El control de equipos es llevado principalmente por el departamento de equipos para mantenimiento, abastecimiento y operación.
- Oficina Técnica debe controlar el adecuado aprovechamiento del recurso y optimizar tiempos de permanencia.
- A partir del programa maestro, junto al jefe de terreno o jefes de área, se deben establecer los equipos requeridos por actividad.
- Se debe registrar el Programa de Equipos.
- Se debe generar Histograma de Equipos con sensibilidad semanal.
- El programa e histograma deben ajustarse contra las fechas actualizadas del programa maestro.
- Se debe controlar semanalmente disponibilidad y utilización.
- Factor de Disponibilidad: horas disponibles sobre horas presentes.
- Factor de Utilización: horas de utilización sobre horas disponibles.
- Si disponibilidad es inferior a 80% por más de 3 semanas, debe analizarse la condición.
- Si utilización es inferior a 60%, debe analizarse devolución, reemplazo o metodología alternativa.

Implicancia para el sistema:

LukeAPP debe generar automáticamente indicadores FD y FU desde la captura diaria. El objetivo no es solo saber cuántas horas trabajó un equipo, sino vincular equipo + actividad + especialidad + producción + causa de detención + disponibilidad + utilización. Desde ahí deben nacer dashboards de Oficina Técnica.

---

### 2.4 Procedimiento Operacional Motoniveladora

Documento orientado a la operación segura de motoniveladora. Refuerza que ciertos equipos requieren operador acreditado, licencia, revisión previa, preparación del equipo, cumplimiento de normas internas y controles de circulación.

Puntos clave:

- Operar sin autorización o licencia interna es falta grave.
- El operador debe portar licencia municipal correspondiente.
- Debe revisar equipo antes de operar.
- Debe confeccionar ART cuando corresponda.
- Debe respetar normas de tránsito y operación interna.

Implicancia para el sistema:

Para equipos operados, el sistema debe exigir operador y, si se implementa, validar acreditación vigente. Debe existir check-in con condición inicial, horómetro/kilometraje, estado y eventualmente evidencia fotográfica.

---

### 2.5 Procedimiento Operación Retroexcavadora

Este procedimiento define la retroexcavadora como equipo utilizado en movimiento de tierra, excavaciones, rampas y trabajos de apoyo a instalaciones. También define operador especializado y actividades asociadas a movimientos, carguío y desplazamiento de material.

Puntos clave:

- La retroexcavadora requiere operador especializado.
- La actividad debe estar claramente asociada al tipo de trabajo ejecutado.
- La operación implica riesgos de movimiento de tierras, tránsito, carguío y cercanía con personal.

Implicancia para el sistema:

El equipo no debe registrarse de manera aislada. Debe quedar asociado a una actividad productiva: excavación, carguío, apoyo a montaje, movimiento de material, apertura de zanja, etc. Esto permite entender para qué se usó el recurso.

---

### 2.6 Procedimiento Específico Operación Minicargador — PE-CODAND-24

Este procedimiento destaca controles específicos de operación, circulación, distancia de seguridad, límites de velocidad, prohibición de transportar personas, prohibición de operar sin autorización y condición del equipo al abandonarlo.

Puntos clave:

- No operar sin autorización.
- No permitir pasajeros.
- Mantener distancia de personas y otros equipos.
- Reducir velocidad en cruces y zonas de baja visibilidad.
- No transportar cargas sobre capacidad nominal.
- Al abandonar el equipo, dejar palancas en neutro, motor detenido, frenos aplicados y llave retirada.
- Debe contar con extintor.

Implicancia para el sistema:

Cada tipo de equipo debe tener controles particulares. Un minicargador requiere controles de operación distintos a una torre de iluminación o plataforma. LukeAPP debe usar plantillas por tipo de equipo, no un formulario único para todos.

---

### 2.7 Procedimiento Específico Inspección Maquinaria Chancado Fino — PE-CODAND-68

Este procedimiento está orientado a inspección de maquinaria, identificación de peligros, métodos de trabajo, materiales, equipos, EPP, registros y anexos. Refuerza la necesidad de que toda inspección tenga estructura, secuencia, responsables y evidencias.

Puntos clave:

- Define objetivo, alcance, responsabilidades, actividades, registros y anexos.
- La inspección debe proteger vida y salud de trabajadores.
- Debe identificar peligros y controles.
- Debe dejar registros.

Implicancia para el sistema:

LukeAPP debe tener un módulo de inspecciones configurable por tipo de equipo o actividad. No todas las inspecciones aplican a todos los equipos. Debe existir evidencia y resultado: conforme, observado, no conforme, requiere intervención, fuera de servicio.

---

## 3. Lectura transversal de los procedimientos

Los documentos revisados muestran un patrón común:

1. Toda actividad debe tener responsable.
2. Toda operación debe tener trazabilidad.
3. Toda intervención debe tener controles de seguridad.
4. Toda mantención debe quedar registrada.
5. Toda evidencia debe poder recuperarse.
6. Todo equipo debe vincularse a obra, actividad, usuario y estado.
7. Los equipos deben analizarse por disponibilidad y utilización.
8. Los documentos en papel existen para comprobar decisiones, actividades o condiciones.
9. La app debe generar documentos desde datos capturados en terreno.

---

## 4. Cambio conceptual necesario

### Enfoque incorrecto

```text
Equipo → Operador → Reporte
```

Este enfoque sirve para inventario, pero no para gestión operacional completa.

### Enfoque correcto

```text
Actividad → Especialidad → Cuadrilla → Recursos → Producción → Evidencia → Documento
```

La maquinaria queda dentro de “recursos”, junto con cuadrillas, operadores, riggers, herramientas y equipos auxiliares.

---

## 5. Clasificación operacional de equipos

No todos los equipos deben pedir los mismos datos. El sistema debe reconocer perfiles o plantillas operacionales.

### Equipos operados

Ejemplos:

- Excavadora
- Retroexcavadora
- Camión tolva
- Bulldozer
- Cargador frontal

Datos y controles típicos:

- Operador obligatorio.
- Horómetro u odómetro.
- Combustible.
- Actividad asociada.
- Supervisor.
- Check-in y check-out.
- Evidencia si aplica.

### Equipos de izaje

Ejemplos:

- Camión pluma
- Grúa
- Manlift

Datos y controles típicos:

- Operador obligatorio.
- Rigger obligatorio según operación.
- Supervisor.
- Actividad.
- Control de izaje o maniobra.
- Evidencia.

### Equipos auxiliares

Ejemplos:

- Torre de iluminación.
- Generador.
- Compresor.

Datos y controles típicos:

- Ubicación.
- Estado.
- Combustible o energía si aplica.
- Mantención.
- No siempre operador.
- No siempre rigger.

### Plataformas y recursos de apoyo

Ejemplos:

- Camas.
- Plataformas.
- Contenedores.
- Recursos asignables a especialidad.

Datos y controles típicos:

- Ubicación.
- Especialidad asignada.
- Estado cargada/limpia.
- Disponibilidad.
- Observación.

---

## 6. Servicio de cuadrillas vivo

El siguiente módulo natural es el servicio de cuadrillas. Su objetivo no es controlar asistencia como RRHH, sino calcular horas hombre por actividad.

La lógica debe ser:

```text
Actividad + Dotación + Horas = HH consumidas
```

Y luego:

```text
Producción ejecutada / HH = rendimiento
```

El supervisor debe informar:

- Actividad.
- Especialidad.
- Cantidad planificada.
- Unidad.
- Programada o no programada.
- Cuadrilla estimada.
- Recursos requeridos.

Durante la jornada o al cierre debe informar:

- Cantidad ejecutada.
- Dotación real.
- Horas reales.
- Causas de desviación.
- Evidencias si aplica.

El sistema debe calcular:

- HH por actividad.
- HH por especialidad.
- HH por frente.
- HH por recurso.
- Rendimiento.
- Cumplimiento de planificación.
- Trabajo programado vs no programado.

---

## 7. Programada vs no programada

Este atributo es estratégico.

Permite separar:

### Trabajo programado

- Incluido en POD.
- Planificado.
- Con recursos previstos.

### Trabajo no programado

- Emergencia.
- Retrabajo.
- Falla.
- Solicitud cliente.
- Condición de terreno.
- Interferencia.

Esto permitirá medir madurez operacional:

```text
% trabajo programado vs % trabajo reactivo
```

---

## 8. Filosofía documental LukeAPP

La gran regla:

> **No digitalizar formularios. Reproducir documentos automáticamente desde interacciones.**

Cada vez que exista un documento en papel, el equipo de desarrollo debe hacerse estas preguntas:

1. ¿Qué documento es?
2. ¿Quién lo genera?
3. ¿Qué información contiene?
4. ¿Qué actor conoce esa información en terreno?
5. ¿En qué momento natural de la operación puede capturarse?
6. ¿Qué dato debe quedar estructurado?
7. ¿Qué evidencia debe quedar adjunta?
8. ¿Qué documento se puede reconstruir automáticamente?

Ejemplos de documentos que deben tender a generarse por la app:

- Reporte diario.
- Control de equipos.
- Parte diario operacional.
- Control de cuadrillas.
- Registro de HH.
- Programa de equipos.
- Histograma de equipos.
- Resumen de disponibilidad.
- Resumen de utilización.
- Control de combustible.
- Bitácora de eventos.
- Registro de mantención.
- Registro de inspección.
- Evidencias de terreno.

---

## 9. Implicancias sobre el modelo actual

La base observada ya tiene fundamentos valiosos:

- Equipos.
- Personal.
- Proyectos.
- Especialidades.
- Reportes diarios.
- Eventos de jornada.
- Evidencias.
- Planificación por bloques POD.
- Participación POD.
- Tareas programadas.
- WhatsApp como canal operacional.
- Vouchers de combustible.

Pero requiere evolucionar hacia:

- Actividades como entidad central.
- Recursos asociados a actividad.
- Cuadrillas por actividad.
- Producción planificada y ejecutada.
- Controles dinámicos por tipo de equipo.
- Mantenciones programadas y ejecutadas.
- Inspecciones configurables.
- Documentos generados automáticamente.
- Indicadores FD/FU y HH/productividad.

---

## 10. Prompt para el desarrollador

```text
Actúa como arquitecto funcional y desarrollador senior de LukeAPP / LukeMaquinarias.

Debes entender que LukeAPP no es una aplicación de maquinaria, ni un inventario de activos, ni un simple sistema documental.

LukeAPP es una plataforma de captura operacional en tiempo real, cuyo objetivo es transformar las interacciones naturales de la obra en datos estructurados, evidencia trazable, indicadores y documentos generados automáticamente.

La entidad principal del sistema no debe ser el equipo.

La entidad principal debe ser la ACTIVIDAD.

Cada actividad debe responder:

- Qué se hará.
- Qué especialidad la ejecutará.
- Si es programada o no programada.
- Cuánto se planifica ejecutar.
- En qué unidad se cuantifica.
- Qué cuadrilla participará.
- Qué equipos o recursos se usarán.
- Qué cantidad se ejecutó realmente.
- Cuántas HH consumió.
- Qué evidencias respaldan la ejecución.
- Qué desviaciones ocurrieron.

La maquinaria debe modelarse como recurso operacional asociado a una actividad.

No todos los equipos tienen los mismos atributos ni los mismos controles.

El sistema debe trabajar con perfiles o plantillas operacionales de equipo.

Ejemplo:

- Una excavadora requiere operador, horómetro, combustible y actividad.
- Un camión pluma puede requerir operador y rigger.
- Una torre de iluminación puede no requerir operador.
- Un generador puede requerir ubicación, estado, combustible y horómetro.
- Una plataforma puede quedar cargada o limpia y asociada a una especialidad.

Por lo tanto, no se debe construir un formulario único para todos los equipos.

Los controles deben activarse dinámicamente según:

- Tipo de equipo.
- Tipo de actividad.
- Tipo de intervención.
- Riesgos asociados.
- Requisitos de la especialidad.

La aplicación debe capturar actividad, producción, HH, equipos, cuadrillas y evidencias con la mínima fricción posible, preferentemente mediante interacción simple por app, QR o WhatsApp.

Cuando exista un documento en papel, no se debe partir digitalizando el formulario.

Siempre se debe preguntar:

- Quién genera este documento.
- Qué información usa para completarlo.
- En qué momento de la operación se conoce esa información.
- Cómo podemos capturar esa información naturalmente.
- Cómo podemos reconstruir el documento automáticamente desde datos estructurados.

La meta es que el documento sea consecuencia de la operación, no una tarea administrativa adicional.

El sistema debe permitir generar automáticamente:

- Reporte diario.
- Control de equipos.
- Control de cuadrillas.
- Registro de horas hombre.
- Bitácora de actividad.
- Control de combustible.
- Histograma de equipos.
- Indicadores de disponibilidad y utilización.
- Resumen de producción.
- Evidencias asociadas.

El desarrollo debe priorizar:

1. Actividades como núcleo del modelo.
2. Servicio de cuadrillas vivo para HH por actividad.
3. Recursos asociados a la actividad.
4. Controles dinámicos por tipo de equipo.
5. Producción planificada vs ejecutada.
6. Trabajo programado vs no programado.
7. Evidencia capturada en terreno.
8. Generación automática de documentos.
9. Indicadores para Oficina Técnica, Producción, Maquinarias y Prevención.

El éxito no se mide por cuántos formularios tenga la app.

Se mide por cuántos documentos y reportes logra generar automáticamente a partir de interacciones reales de terreno.
```

---

## 11. Entregables funcionales recomendados para la siguiente etapa

1. Catálogo de tipos de equipo y perfil operacional.
2. Catálogo de actividades por especialidad.
3. Servicio de cuadrillas por actividad.
4. Registro de cantidad planificada y ejecutada.
5. Registro de trabajo programado/no programado.
6. Recursos usados por actividad.
7. Indicadores HH por actividad.
8. Indicadores FD/FU por equipo.
9. Motor documental automático.
10. Matriz documento-papel → interacción → dato → documento generado.

---

## 12. Conclusión

La visión correcta para LukeAPP es convertir la operación diaria de obra en una fuente única de verdad. La maquinaria es importante, pero no es el centro. El centro es la actividad productiva y la forma en que actores reales —supervisores, operadores, riggers, cuadrillas, calidad, prevención y oficina técnica— interactúan con ella.

Si la aplicación captura esas interacciones de manera simple, estructurada y trazable, podrá generar automáticamente los documentos que hoy se producen en papel, calcular HH por actividad, medir producción real, monitorear disponibilidad y utilización de equipos, y entregar a la empresa una visión operacional que actualmente se encuentra dispersa en reportes manuales, planillas y conversaciones.
