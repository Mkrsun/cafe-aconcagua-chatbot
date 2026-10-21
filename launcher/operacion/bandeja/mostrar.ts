import type {
  ConversacionBandeja,
  MensajeBandeja,
} from "../../../src/bandeja/dominio/conversacion.js";

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });

/** Una línea por conversación: estado, id, cliente, quién la lleva y el motivo. */
export function lineaDeConversacion(
  c: ConversacionBandeja,
  nombre: string | undefined,
) {
  const partes = [
    `[${c.estado}] ${c.id}`,
    `${nombre ?? "sin ficha"} (${c.telefono ?? "sin teléfono"})`,
    hora(c.actualizadaEn),
    ...(c.propietario ? [`la lleva ${c.propietario}`] : []),
    ...(c.motivoHandoff ? [c.motivoHandoff] : []),
  ];
  return partes.join(" · ");
}

const autor = (m: MensajeBandeja) =>
  m.autor === "cliente"
    ? "Cliente"
    : m.autor === "humano"
      ? (m.autorNombre ?? "Equipo")
      : "Chatbot";

/** El hilo completo, con el motivo y el resumen del traspaso arriba si los hay. */
export function hiloDeConversacion(
  c: ConversacionBandeja,
  nombre: string | undefined,
): string[] {
  return [
    lineaDeConversacion(c, nombre),
    ...(c.resumenHandoff ? [`Resumen: ${c.resumenHandoff}`] : []),
    "",
    ...c.mensajes.map((m) => `${hora(m.creadoEn)} ${autor(m)}: ${m.texto}`),
  ];
}
