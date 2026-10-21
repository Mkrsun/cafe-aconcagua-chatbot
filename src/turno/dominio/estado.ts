import type { DespachoCotizado } from "../../catalogo/dominio/despacho/cotizar.js";
import type { LineaDelPedido } from "../../pedidos/dominio/pedido.js";
import type { LineaPedida } from "./cotizar.js";

/** El resumen que vio el cliente: lo que confirma con un «sí». */
export interface Propuesta {
  readonly digest: string;
  readonly lineas: readonly LineaDelPedido[];
  readonly despacho?: DespachoCotizado;
  readonly total: number;
  /** Una propuesta vieja no se confirma a ciegas. */
  readonly venceEn: string;
}

/** Lo que el chatbot recuerda de una conversación entre turnos (en los registros). */
export interface EstadoDelTurno {
  readonly lineas: readonly LineaPedida[];
  readonly propuesta?: Propuesta;
  /** El último pedido registrado en esta conversación y su enlace de pago. */
  readonly pedido?: { readonly id: string; readonly url?: string };
  /** Lo que dijo el cliente de su comuna o zona (con tarifa conocida). */
  readonly zona?: string;
  readonly intercambios: readonly {
    readonly cliente: string;
    readonly chatbot: string;
  }[];
  /** SKU mencionados o recomendados, el más reciente primero: "ese" tiene referente. */
  readonly refs: readonly string[];
  readonly reclamo?: {
    readonly ultimoEn: string;
    readonly notas: readonly string[];
  };
}

export const ESTADO_INICIAL: EstadoDelTurno = {
  lineas: [],
  intercambios: [],
  refs: [],
};
export const INTERCAMBIOS = 10;
const REFS = 8;
const DIA_MS = 86_400_000;

export const conIntercambio = (
  e: EstadoDelTurno,
  cliente: string,
  chatbot: string,
) => ({
  ...e,
  intercambios: [...e.intercambios, { cliente, chatbot }].slice(-INTERCAMBIOS),
});

/** Solo SKU del catálogo visible: la memoria nunca guarda un producto inventado. */
export const conRefs = (
  e: EstadoDelTurno,
  nuevas: readonly string[],
  visibles: Set<string>,
) => ({
  ...e,
  refs: [
    ...new Set([...nuevas.filter((s) => visibles.has(s)), ...e.refs]),
  ].slice(0, REFS),
});

export const propuestaVigente = (e: EstadoDelTurno, ahora: Date) =>
  !!e.propuesta && Date.parse(e.propuesta.venceEn) > ahora.getTime();

export const reclamoAbierto = (e: EstadoDelTurno, ahora: Date) =>
  !!e.reclamo && ahora.getTime() - Date.parse(e.reclamo.ultimoEn) < DIA_MS;

export const conNotaDeReclamo = (
  e: EstadoDelTurno,
  nota: string,
  ahora: Date,
) => ({
  ...e,
  reclamo: {
    ultimoEn: ahora.toISOString(),
    notas: [...(reclamoAbierto(e, ahora) ? e.reclamo!.notas : []), nota].slice(
      -4,
    ),
  },
});
