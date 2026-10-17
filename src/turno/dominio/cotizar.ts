import type { FotoDelCatalogo } from "../../catalogo/dominio/precio.js";
import { resolverPrecio } from "../../catalogo/dominio/precio.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import type { LineaDelPedido } from "../../pedidos/dominio/pedido.js";

/** Una línea que el cliente pidió: el SKU y cuántas. */
export interface LineaPedida {
  readonly sku: string;
  readonly cantidad: number;
}

/** Un formato del pedido sin precio configurado o no disponible: no se cotiza a ciegas. */
export class PrecioPendiente extends Error {
  constructor(readonly sku: string) {
    super(`Precio pendiente de ${sku}`);
    this.name = "PrecioPendiente";
  }
}

/** Las líneas con el precio del tramo del cliente y el total de productos. */
export function cotizarLineas(
  lineas: readonly LineaPedida[],
  foto: FotoDelCatalogo,
  tramo: Tramo,
): { readonly lineas: LineaDelPedido[]; readonly totalProductos: number } {
  const cotizadas = lineas.map((l): LineaDelPedido => {
    const precio = resolverPrecio(foto, l.sku, tramo);
    const formato = foto.visibles.find((f) => f.sku === l.sku);
    if (precio.estado !== "configurado" || !formato)
      throw new PrecioPendiente(l.sku);
    return {
      sku: l.sku,
      nombreInterno: formato.nombre,
      cantidad: l.cantidad,
      ...(formato.gramaje ? { gramaje: formato.gramaje } : {}),
      precioUnitario: precio.montoClp,
      subtotal: precio.montoClp * l.cantidad,
    };
  });
  return {
    lineas: cotizadas,
    totalProductos: cotizadas.reduce((s, l) => s + l.subtotal, 0),
  };
}

/** Aplica los cambios por SKU: cantidad 0 quita; lo omitido se conserva. */
export function aplicarCambios(
  actuales: readonly LineaPedida[],
  cambios: readonly LineaPedida[],
): LineaPedida[] {
  const porSku = new Map(actuales.map((l) => [l.sku, l.cantidad]));
  for (const c of cambios) porSku.set(c.sku, c.cantidad);
  return [...porSku]
    .filter(([, n]) => n > 0)
    .map(([sku, cantidad]) => ({ sku, cantidad }));
}
