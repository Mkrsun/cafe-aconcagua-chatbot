import type { Reloj } from "../../plataforma/reloj.js";
import {
  pedidoConfirmado,
  primeraVersion,
  type PedidoNuevo,
} from "../dominio/pedido.js";
import type { IPedidos } from "../puertos/pedidos.js";

/** Registra el pedido confirmado con su primera versión; el mismo id dos veces no duplica. */
export class RegistrarPedido {
  constructor(
    private readonly deps: {
      readonly pedidos: IPedidos;
      readonly reloj: Reloj;
    },
  ) {}

  async ejecutar(nuevo: PedidoNuevo): Promise<void> {
    const { pedidos, reloj } = this.deps;
    if (await pedidos.obtener(nuevo.id)) return;
    const ahora = reloj();
    await pedidos.guardarVersion(primeraVersion(nuevo, ahora));
    await pedidos.guardarPedido(pedidoConfirmado(nuevo, ahora));
  }
}
