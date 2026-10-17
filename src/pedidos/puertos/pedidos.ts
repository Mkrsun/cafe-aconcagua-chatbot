import type {
  EstadoDelPedido,
  PagoDelPedido,
  Pedido,
  VersionDelPedido,
} from "../dominio/pedido.js";

export interface PedidoConVersion {
  readonly pedido: Pedido;
  readonly version?: VersionDelPedido;
}

/**
 * Los pedidos, sus versiones y sus pagos (borde: PostgreSQL, tablas `cafe.pedidos`,
 * `cafe.versiones_de_pedidos` y `cafe.pagos`). Real: `PedidosPostgres` · fake: `PedidosEnMemoria`.
 */
export interface IPedidos {
  guardarPedido(pedido: Pedido): Promise<void>;
  /** Solo agrega: una versión repetida es `Conflicto` (la historia no se reescribe). */
  guardarVersion(version: VersionDelPedido): Promise<void>;
  obtener(id: string): Promise<PedidoConVersion | undefined>;
  /** El más nuevo primero. */
  listar(filtro: {
    readonly clienteId?: string;
    readonly estado?: EstadoDelPedido;
  }): Promise<readonly Pedido[]>;
  guardarPago(pago: PagoDelPedido): Promise<void>;
  pagosDe(pedidoId: string): Promise<readonly PagoDelPedido[]>;
  pagoPorReferencia(idEnKhipu: string): Promise<PagoDelPedido | undefined>;
}
