import type { FormatoEditable } from "./formato.js";
import type { Tramo } from "./tramos.js";

export type PrecioResuelto =
  | { readonly estado: "configurado"; readonly montoClp: number }
  | { readonly estado: "pendiente" };

/** El catálogo vigente de un turno: todos los formatos y los que se pueden ofrecer. */
export interface FotoDelCatalogo {
  readonly formatos: readonly FormatoEditable[];
  readonly visibles: readonly FormatoEditable[];
}

export const fotoDe = (
  formatos: readonly FormatoEditable[],
): FotoDelCatalogo => ({
  formatos,
  visibles: formatos.filter((f) => f.disponible),
});

const PENDIENTE: PrecioResuelto = { estado: "pendiente" };

/**
 * El único punto de precio: el monto del tramo de un formato visible. Lo que no está
 * configurado, no existe o no está disponible es pendiente: nunca un monto inventado.
 */
export function resolverPrecio(
  foto: FotoDelCatalogo,
  sku: string,
  tramo: Tramo,
): PrecioResuelto {
  const formato = foto.visibles.find((f) => f.sku === sku);
  const precio = formato?.precios.find((p) => p.tramo === tramo);
  return precio?.estado === "configurado" && precio.montoClp
    ? { estado: "configurado", montoClp: precio.montoClp }
    : PENDIENTE;
}

/** Los precios que nadie ha cargado: la carga los avisa al terminar. */
export const preciosPendientes = (formatos: readonly FormatoEditable[]) =>
  formatos.flatMap((f) =>
    f.precios
      .filter((p) => p.estado === "pendiente")
      .map((p) => ({ sku: f.sku, tramo: p.tramo, nombre: f.nombre })),
  );
