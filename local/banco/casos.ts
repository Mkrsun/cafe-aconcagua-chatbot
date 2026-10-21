import { CASOS_DE_ATENCION } from "./casos-de-atencion.js";
import { CASOS_DE_VENTA } from "./casos-de-venta.js";
import type { Escenario } from "./escenario.js";

/**
 * Los casos del negocio que el chatbot tiene que atender bien. Usan los datos de la semilla
 * (`local/semilla/datos.ts`): Futaleufú y otros con precio, Volcán Osorno sin precio, Ñuñoa y Las
 * Condes con despacho y Puente Alto sin tarifa. Un caso nuevo se agrega en su archivo; `espera` y
 * `menciona` son lo verificable, el resto se lee en el informe.
 */
export const CASOS: readonly Escenario[] = [
  ...CASOS_DE_VENTA,
  ...CASOS_DE_ATENCION,
];
