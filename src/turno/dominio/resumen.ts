import { pesos } from "../../plataforma/pesos.js";
import type { DespachoCotizado } from "../../catalogo/dominio/despacho/cotizar.js";
import type { LineaDelPedido } from "../../pedidos/dominio/pedido.js";
import { TEXTOS } from "./textos.js";

const plazo = (d: DespachoCotizado) =>
  `llega de ${d.plazo.desdeDias} a ${d.plazo.hastaDias} días hábiles después de salir`;

/** La línea del despacho en el resumen: el monto lo pone el catálogo. */
export const lineaDeDespacho = (d: DespachoCotizado) =>
  d.gratis && d.gratisDesdeClp
    ? `Despacho a ${d.zona}: gratis por ser un pedido desde ${pesos(d.gratisDesdeClp)} ` +
      `(${plazo(d)})`
    : d.gratis
      ? `Despacho a ${d.zona}: sin costo (${plazo(d)})`
      : `Despacho a ${d.zona}: ${pesos(d.montoClp)} (${plazo(d)})`;

/** `{{despacho}}`: costo, condición de gratis y plazo de la zona del cliente. */
export const fraseDeDespacho = (d: DespachoCotizado) => {
  const costo =
    d.montoClp === 0 && !d.gratisDesdeClp
      ? "no tiene costo"
      : `cuesta ${pesos(d.montoClp)}`;
  const gratis = d.gratisDesdeClp
    ? `; es gratis en pedidos desde ${pesos(d.gratisDesdeClp)}`
    : "";
  const { desdeDias, hastaDias } = d.plazo;
  const llega = `Llega de ${desdeDias} a ${hastaDias} días hábiles después de salir.`;
  return `El despacho a ${d.zona} ${costo}${gratis}. ${llega}`;
};

/** El resumen contractual del pedido: líneas, despacho, total y la pregunta de confirmación. */
export const textoDelResumen = (r: {
  readonly lineas: readonly LineaDelPedido[];
  readonly despacho?: DespachoCotizado;
  readonly total: number;
}) =>
  [
    ...r.lineas.map(
      (l) =>
        `${l.cantidad} × ${l.nombreInterno ?? l.sku}: ${pesos(l.subtotal)}`,
    ),
    ...(r.despacho ? [lineaDeDespacho(r.despacho)] : []),
    `Total: ${pesos(r.total)}`,
    TEXTOS.cierreDelResumen,
  ].join("\n");
