import type { ClaseDeMensaje } from "./clasificar.js";

/**
 * Cuánto espera el chatbot antes de responder un lote, en milisegundos. Fijos en la
 * configuración y ajustables por entorno: no hay pantalla para editarlos.
 */
export interface TiemposDeEspera {
  readonly incompletoMs: number;
  readonly normalMs: number;
  readonly cierreMs: number;
  /** Tope desde el primer mensaje del lote: nadie espera más. */
  readonly techoMs: number;
}

export const TIEMPOS_POR_DEFECTO: TiemposDeEspera = {
  incompletoMs: 45_000,
  normalMs: 25_000,
  cierreMs: 8_000,
  techoMs: 180_000,
};

export const esperaPara = (
  clase: ClaseDeMensaje,
  t: TiemposDeEspera,
): number =>
  clase === "incompleto"
    ? t.incompletoMs
    : clase === "cierre"
      ? t.cierreMs
      : t.normalMs;
