import { Conflicto } from "../../plataforma/errores.js";
import type {
  EstadoDelPedido,
  PagoDelPedido,
  Pedido,
  VersionDelPedido,
} from "../dominio/pedido.js";
import type { IPedidos } from "../puertos/pedidos.js";

/** Los pedidos en memoria del proceso: desarrollo y pruebas. */
export class PedidosEnMemoria implements IPedidos {
  private readonly pedidos = new Map<string, Pedido>();
  private readonly versiones = new Map<string, VersionDelPedido>();
  private readonly pagos = new Map<string, PagoDelPedido>();

  async guardarPedido(pedido: Pedido) {
    this.pedidos.set(pedido.id, pedido);
  }

  async guardarVersion(version: VersionDelPedido) {
    const repetida = [...this.versiones.values()].some(
      (v) =>
        v.id === version.id ||
        (v.pedidoId === version.pedidoId && v.version === version.version),
    );
    if (repetida) throw new Conflicto("version-existe");
    this.versiones.set(version.id, version);
  }

  async obtener(id: string) {
    const pedido = this.pedidos.get(id);
    if (!pedido) return undefined;
    const version = this.versiones.get(pedido.versionVigenteId);
    return { pedido, ...(version ? { version } : {}) };
  }

  async listar(filtro: { clienteId?: string; estado?: EstadoDelPedido }) {
    return [...this.pedidos.values()]
      .filter((p) => !filtro.clienteId || p.clienteId === filtro.clienteId)
      .filter((p) => !filtro.estado || p.estado === filtro.estado)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }

  async guardarPago(pago: PagoDelPedido) {
    this.pagos.set(pago.id, pago);
  }

  async pagosDe(pedidoId: string) {
    return [...this.pagos.values()].filter((p) => p.pedidoId === pedidoId);
  }

  async pagoPorReferencia(idEnKhipu: string) {
    return [...this.pagos.values()].find((p) => p.idEnKhipu === idEnKhipu);
  }
}
