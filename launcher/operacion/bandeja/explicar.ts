import {
  Conflicto,
  DatosInvalidos,
  FalloExterno,
  NoEncontrado,
} from "../../../src/plataforma/errores.js";

const FUERA_DE_VENTANA =
  "Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja enviar " +
  "plantillas aprobadas. Espera a que el cliente escriba o llámalo.";

/** Lo que se le explica a quien opera la bandeja, sin trazas internas. */
export function explicar(error: unknown): string {
  if (error instanceof Conflicto && error.codigo === "fuera-de-ventana")
    return FUERA_DE_VENTANA;
  if (error instanceof DatosInvalidos) return error.detalle;
  if (error instanceof NoEncontrado || error instanceof FalloExterno)
    return error.message;
  return error instanceof Error ? error.message : String(error);
}
