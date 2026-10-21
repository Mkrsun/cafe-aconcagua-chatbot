import type { DecisionDelTurno } from "../../src/turno/dominio/decision.js";

/** Una decisión completa del turno con lo que la prueba quiere cambiar. */
export const decision = (d: Partial<DecisionDelTurno>): DecisionDelTurno => ({
  intent: "pedido",
  action: "RESPONDER",
  changes: [],
  knownRefs: [],
  faltantes: [],
  despacho: "",
  forma: { tipo: "texto", opciones: [], skus: [] },
  response: "",
  recordar: [],
  ...d,
});
