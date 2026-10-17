import type { ZonaDefinida } from "../src/carga/index.js";

/**
 * Las zonas de despacho de Café: comunas, costo en pesos, desde qué total es gratis y el plazo en
 * días hábiles. Una comuna sin zona no se cotiza: el chatbot le pasa el caso a la encargada.
 * Ejemplo:
 *
 *   { zona: "Santiago oriente", comunas: ["Ñuñoa", "Providencia"], montoClp: 3990,
 *     gratisDesdeClp: 40000, plazo: { desdeDias: 1, hastaDias: 2 } }
 */
export const DESPACHO: readonly ZonaDefinida[] = [];
