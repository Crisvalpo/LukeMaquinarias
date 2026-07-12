export function horasTranscurridas(desdeISO, hasta = new Date()) {
  return (hasta - new Date(desdeISO)) / 3600000;
}

export function formatFechaHoraChile(fecha = new Date()) {
  return fecha.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " (hora de Chile)";
}
