import { huellaDe } from "../../plataforma/huella.js";
import { TRAMOS, type Tramo } from "./tramos.js";

/** Un formato vendible: un SKU de una familia (el café). */
export interface Formato {
  readonly sku: string;
  readonly nombre: string;
  /** Id de la familia (`cafe.familias.id`): agrupa los formatos de un café. */
  readonly familia: string;
  readonly familiaNombre: string;
  readonly gramaje?: string;
  readonly disponible: boolean;
}

export interface PrecioEditable {
  readonly sku: string;
  readonly tramo: Tramo;
  readonly estado: "configurado" | "pendiente";
  readonly montoClp?: number;
  /** Revisión por contenido: la escritura trae la que vio quien escribe. */
  readonly revision: string;
}

export interface FormatoEditable extends Formato {
  readonly revision: string;
  /** Uno por tramo, en el orden de `TRAMOS`. */
  readonly precios: readonly PrecioEditable[];
}

/** El precio de un tramo; un monto que no es entero positivo es pendiente. */
export function precioEditable(
  sku: string,
  tramo: Tramo,
  monto?: number | null,
): PrecioEditable {
  const configurado = Number.isSafeInteger(monto) && (monto as number) > 0;
  const contenido = configurado
    ? { sku, tramo, estado: "configurado" as const, montoClp: monto as number }
    : { sku, tramo, estado: "pendiente" as const };
  return { ...contenido, revision: huellaDe(contenido) };
}

const soloFormato = (f: Formato): Formato => ({
  sku: f.sku,
  nombre: f.nombre,
  familia: f.familia,
  familiaNombre: f.familiaNombre,
  ...(f.gramaje ? { gramaje: f.gramaje } : {}),
  disponible: f.disponible,
});

/** Un formato con su revisión y sus precios por tramo (los que falten quedan pendientes). */
export function formatoEditable(
  formato: Formato,
  montos: Partial<Record<Tramo, number | null>>,
): FormatoEditable {
  const base = soloFormato(formato);
  return {
    ...base,
    revision: huellaDe(base),
    precios: TRAMOS.map((t) => precioEditable(base.sku, t, montos[t])),
  };
}

/** Los montos configurados de un formato editable, por tramo. */
export const montosDe = (f: FormatoEditable): Partial<Record<Tramo, number>> =>
  Object.fromEntries(
    f.precios.filter((p) => p.montoClp).map((p) => [p.tramo, p.montoClp]),
  );
