import type { Reloj } from "../../plataforma/reloj.js";
import type { IProveedorDePago } from "../puertos/cobro.js";
import type { IPedidos } from "../puertos/pedidos.js";

export interface DepsConciliarPago {
  readonly pedidos: IPedidos;
  readonly proveedor: IProveedorDePago;
  readonly reloj: Reloj;
  /** Lo que pasa la primera vez que un pago queda verificado (el aviso de pago recibido). */
  readonly alPagar: (pedidoId: string) => Promise<unknown>;
}

/**
 * Concilia un aviso de Khipu: nunca cree el cuerpo; consulta a Khipu y solo vale si
 * está pagado, es de ese pedido y por el monto registrado. Repetido, no vuelve a avisar.
 */
export class ConciliarPago {
  constructor(private readonly deps: DepsConciliarPago) {}

  async ejecutar(idDelProveedor: string): Promise<{ confirmado: boolean }> {
    const { pedidos, proveedor, reloj } = this.deps;
    const pago = await pedidos.pagoPorReferencia(idDelProveedor);
    if (!pago) return { confirmado: false };
    if (pago.estado === "verificado") return { confirmado: true };
    const consulta = await proveedor.consultar(idDelProveedor);
    const valido =
      consulta.estado === "pagado" &&
      consulta.referencia === pago.pedidoId &&
      consulta.montoClp === pago.monto;
    if (!valido) return { confirmado: false };
    const ahora = reloj().toISOString();
    await pedidos.guardarPago({
      ...pago,
      estado: "verificado",
      verificadoPor: "khipu",
      verificadoEn: ahora,
    });
    const leido = await pedidos.obtener(pago.pedidoId);
    if (leido)
      await pedidos.guardarPedido({
        ...leido.pedido,
        estado: "pagado",
        actualizadoEn: ahora,
      });
    await this.deps
      .alPagar(pago.pedidoId)
      .catch((error: unknown) =>
        console.warn("no se pudo avisar el pago recibido", error),
      );
    return { confirmado: true };
  }
}
