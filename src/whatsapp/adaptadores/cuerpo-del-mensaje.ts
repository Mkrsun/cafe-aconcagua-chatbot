import { validarContenido } from "../dominio/interactivos/validar.js";
import type { MensajeSaliente } from "../puertos/canal.js";
import { cuerpoDeLaPlantilla, cuerpoDelContenido } from "./cuerpo-cloud-api.js";

/**
 * Qué sale por Cloud API: la plantilla manda (fuera de la ventana es lo único que Meta acepta);
 * después el contenido, si cumple los límites; si no, el texto.
 */
export function cuerpoDelMensaje(
  m: Omit<MensajeSaliente, "telefono"> & { telefono?: string },
) {
  if (m.plantilla) return cuerpoDeLaPlantilla(m.plantilla);
  const cita = m.citando ? { context: { message_id: m.citando } } : {};
  if (m.contenido && validarContenido(m.contenido).valido)
    return { ...cuerpoDelContenido(m.contenido), ...cita };
  return { type: "text", text: { body: m.texto }, ...cita };
}
