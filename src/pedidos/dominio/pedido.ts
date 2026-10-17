export type EstadoDelPedido =
  "confirmado" | "pago_pendiente" | "pagado" | "cancelado";

export type EstadoDelPago = "pendiente" | "verificado" | "rechazado";

/** Quien registra los pedidos que confirma el cliente por WhatsApp. */
export const ACTOR_DEL_CHATBOT = "chatbot";

/** Una línea tal como quedó en la versión: los montos los calculó el sistema, nunca el modelo. */
export interface LineaDelPedido {
  readonly sku: string;
  readonly nombreInterno?: string;
  readonly cantidad: number;
  readonly gramaje?: string;
  readonly precioUnitario: number;
  readonly subtotal: number;
}

/** Lo que el turno registra cuando el cliente confirma. */
export interface PedidoNuevo {
  /** Estable por propuesta: el mismo «sí» dos veces no crea dos pedidos. */
  readonly id: string;
  readonly clienteId: string;
  readonly conversacionId?: string;
  readonly lineas: readonly LineaDelPedido[];
  readonly total: number;
  /** Para el equipo, p. ej. el despacho cotizado. */
  readonly notas?: string;
}

/** El pedido: su estado y cuál de sus versiones vale. */
export interface Pedido {
  readonly id: string;
  readonly clienteId: string;
  readonly conversacionId?: string;
  readonly estado: EstadoDelPedido;
  readonly versionVigenteId: string;
  readonly version: number;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
  readonly creadoPor: string;
}

/** Una versión inmutable del pedido: lo que se cobra sale de aquí. */
export interface VersionDelPedido {
  readonly id: string;
  readonly pedidoId: string;
  readonly version: number;
  readonly lineas: readonly LineaDelPedido[];
  readonly total: number;
  readonly notas?: string;
  readonly origen: { readonly actor: string; readonly motivo: string };
  readonly creadaEn: string;
}

/** Un cobro del pedido por Khipu, con su enlace de pago. */
export interface PagoDelPedido {
  readonly id: string;
  readonly pedidoId: string;
  readonly monto: number;
  readonly estado: EstadoDelPago;
  readonly idEnKhipu: string;
  readonly url: string;
  readonly creadoPor: string;
  readonly creadoEn: string;
  readonly verificadoPor?: string;
  readonly verificadoEn?: string;
}

const idDeLaPrimeraVersion = (pedidoId: string) => `${pedidoId}:v1`;

export const pedidoConfirmado = (p: PedidoNuevo, ahora: Date): Pedido => ({
  id: p.id,
  clienteId: p.clienteId,
  ...(p.conversacionId ? { conversacionId: p.conversacionId } : {}),
  estado: "confirmado",
  versionVigenteId: idDeLaPrimeraVersion(p.id),
  version: 1,
  creadoEn: ahora.toISOString(),
  actualizadoEn: ahora.toISOString(),
  creadoPor: ACTOR_DEL_CHATBOT,
});

export const primeraVersion = (
  p: PedidoNuevo,
  ahora: Date,
): VersionDelPedido => ({
  id: idDeLaPrimeraVersion(p.id),
  pedidoId: p.id,
  version: 1,
  lineas: p.lineas,
  total: p.total,
  ...(p.notas ? { notas: p.notas } : {}),
  origen: {
    actor: ACTOR_DEL_CHATBOT,
    motivo: "El cliente confirmó el resumen",
  },
  creadaEn: ahora.toISOString(),
});
