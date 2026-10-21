/**
 * Los dos tramos de la lista de precios de Café. Fijos: no hay motor de reglas
 * comerciales; un precio especial lo cotiza una persona.
 */
export const TRAMOS = ["minorista", "mayorista"] as const;
export type Tramo = (typeof TRAMOS)[number];

export const esTramo = (valor: unknown): valor is Tramo =>
  TRAMOS.includes(valor as Tramo);

/** El tramo de la ficha del cliente (`price_tier`); uno desconocido se cotiza como minorista. */
export const tramoDe = (priceTier: string | undefined): Tramo =>
  esTramo(priceTier) ? priceTier : "minorista";
