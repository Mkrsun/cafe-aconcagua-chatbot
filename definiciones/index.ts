import type { DefinicionesDeCafe } from "../src/carga/index.js";
import { CATALOGO } from "./catalogo.js";
import { DESPACHO } from "./despacho.js";
import { PERFILES_DE_CAFE } from "./perfiles.js";
import { PREGUNTAS_FRECUENTES } from "./preguntas-frecuentes.js";

/** Lo que define el negocio de Café Aconcagua; `pnpm cargar` deja la base igual a esto. */
export const DEFINICIONES_DE_CAFE: DefinicionesDeCafe = {
  catalogo: CATALOGO,
  despacho: DESPACHO,
  preguntas: PREGUNTAS_FRECUENTES,
  perfiles: PERFILES_DE_CAFE,
};
