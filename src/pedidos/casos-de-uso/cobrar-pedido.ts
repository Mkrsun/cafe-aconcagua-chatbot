import { randomUUID } from "node:crypto";
import type { Reloj } from "../../plataforma/reloj.js";
import { ACTOR_DEL_CHATBOT } from "../dominio/pedido.js";
import type { IProveedorDePago } from "../puertos/cobro.js";
import type { IPedidos } from "../puertos/pedidos.js";

export interface EnlaceDePago {
  readonly url: string;
  readonly montoClp: number;
}

export interface DepsCobrarPedido {
  readonly pedidos: IPedidos;
  readonly reloj: Reloj;
  /** Sin Khipu configurado no hay cobro automático: el pedido lo cobra una persona. */
  readonly proveedor?: IProveedorDePago;
}

/**
 * El enlace de Khipu por el total de la versión vigente. Idempotente: un cobro ya
 * creado se reusa. Si Khipu falla, no hay enlace (`undefined`) y el turno traspasa el pedido.
 */
export class CobrarPedido {
  constructor(private readonly deps: DepsCobrarPedido) {}

  async ejecutar(pedidoId: string): Promise<EnlaceDePago | undefined> {
    const { pedidos, proveedor, reloj } = this.deps;
    if (!proveedor) return undefined;
    const previo = (await pedidos.pagosDe(pedidoId)).find(
      (p) => p.estado !== "rechazado",
    );
    if (previo) return { url: previo.url, montoClp: previo.monto };
    const leido = await pedidos.obtener(pedidoId);
    if (!leido?.version) return undefined;
    const montoClp = leido.version.total;
    try {
      const cobro = await proveedor.crearCobro({
        referencia: pedidoId,
        montoClp,
        asunto: `Pedido ${pedidoId} de Café Aconcagua`,
      });
      const ahora = reloj().toISOString();
      await pedidos.guardarPago({
        id: `pago_${randomUUID()}`,
        pedidoId,
        monto: montoClp,
        estado: "pendiente",
        idEnKhipu: cobro.id,
        url: cobro.url,
        creadoPor: ACTOR_DEL_CHATBOT,
        creadoEn: ahora,
      });
      await pedidos.guardarPedido({
        ...leido.pedido,
        estado: "pago_pendiente",
        actualizadoEn: ahora,
      });
      return { url: cobro.url, montoClp };
    } catch (error) {
      console.warn(`no se pudo crear el cobro del pedido ${pedidoId}`, error);
      return undefined;
    }
  }
}
