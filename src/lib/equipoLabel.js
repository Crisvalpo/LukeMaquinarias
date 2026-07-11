// Algunos operadores reconocen su equipo por la patente antes que por el
// codigo_interno -- se muestra "codigo - patente" cuando la patente existe.
export function formatEquipoLabel(equipo) {
  if (!equipo) return "";
  return equipo.patente ? `${equipo.codigo_interno} - ${equipo.patente}` : equipo.codigo_interno;
}
