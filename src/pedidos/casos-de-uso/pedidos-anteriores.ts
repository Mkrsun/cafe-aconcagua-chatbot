import type { IPedidos } from "../puertos/pedidos.js";

/** Un pedido anterior como lo recuerda el chatbot: cuándo y qué, sin montos (cambian). */
export interface PedidoAnterior {
  readonly fecha: string;
  readonly productos: readonly string[];
}

export const PEDIDOS_QUE_SE_RECUERDAN = 3;

/** Los últimos pedidos del cliente (no cancelados), el más nuevo primero. */
export async function pedidosAnteriores(
  pedidos: IPedidos,
  clienteId: string,
): Promise<PedidoAnterior[]> {
  const ultimos = (await pedidos.listar({ clienteId }))
    .filter((p) => p.estado !== "cancelado")
    .slice(0, PEDIDOS_QUE_SE_RECUERDAN);
  const conVersion = await Promise.all(
    ultimos.map((p) => pedidos.obtener(p.id)),
  );
  return conVersion.flatMap((p) =>
    p?.version
      ? [
          {
            fecha: p.pedido.creadoEn.slice(0, 10),
            productos: p.version.lineas.map(
              (l) => `${l.cantidad} × ${l.nombreInterno ?? l.sku}`,
            ),
          },
        ]
      : [],
  );
}
