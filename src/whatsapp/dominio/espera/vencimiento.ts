import type { ClaseDeMensaje } from "./clasificar.js";
import { esperaPara, type TiemposDeEspera } from "./tiempos.js";

/** Lo que importa de un lote para saber cuándo responderlo. */
export interface EstadoDeEspera {
  readonly abiertoEn: Date;
  readonly ultimoMensajeEn: Date;
  readonly ultimaClase: ClaseDeMensaje;
}

/**
 * Cuándo se responde un lote: la espera según cómo terminó el último mensaje, cortada por el techo
 * desde el primero. WhatsApp no avisa cuándo el cliente escribe: solo rige esta espera.
 */
export function vencimientoDelLote(
  lote: EstadoDeEspera,
  tiempos: TiemposDeEspera,
): Date {
  const base =
    lote.ultimoMensajeEn.getTime() + esperaPara(lote.ultimaClase, tiempos);
  const techo = lote.abiertoEn.getTime() + tiempos.techoMs;
  return new Date(Math.min(base, techo));
}
