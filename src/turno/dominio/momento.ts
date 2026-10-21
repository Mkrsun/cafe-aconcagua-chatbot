const FORMATO = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** «martes 20 de octubre, 12:00»: para que el chatbot sepa si hoy se atiende o es fin de semana. */
export function momentoEnChile(fecha: Date): string {
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    FORMATO.formatToParts(fecha).find((p) => p.type === tipo)?.value ?? "";
  return (
    `${parte("weekday")} ${parte("day")} de ${parte("month")}, ` +
    `${parte("hour")}:${parte("minute")}`
  );
}
