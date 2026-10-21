import { describe, expect, it } from "vitest";
import { PedidosEnMemoria } from "../adaptadores/pedidos-en-memoria.js";
import { pedidosAnteriores } from "./pedidos-anteriores.js";
import { RegistrarPedido } from "./registrar-pedido.js";

const linea = (sku: string, nombreInterno: string, cantidad: number) => ({
  sku,
  nombreInterno,
  cantidad,
  precioUnitario: 9990,
  subtotal: 9990 * cantidad,
});

describe("los pedidos anteriores de un cliente, para recordarlos sin montos", () => {
  it("los últimos primero, con fecha y productos; nunca montos ni pedidos de otros", async () => {
    const pedidos = new PedidosEnMemoria();
    let dia = 10;
    const registrar = new RegistrarPedido({
      pedidos,
      reloj: () => new Date(`2026-10-${dia++}T15:00:00.000Z`),
    });
    for (const [id, cliente, lineas] of [
      ["ped_1", "cli_1", [linea("0028", "Futaleufú — 150 gramos / Molido", 2)]],
      [
        "ped_2",
        "cli_2",
        [linea("0025", "Futaleufú — 150 gramos / Grano entero", 1)],
      ],
      [
        "ped_3",
        "cli_1",
        [linea("0025", "Futaleufú — 150 gramos / Grano entero", 3)],
      ],
    ] as const)
      await registrar.ejecutar({ id, clienteId: cliente, lineas, total: 1 });
    const anteriores = await pedidosAnteriores(pedidos, "cli_1");
    expect(anteriores).toEqual([
      {
        fecha: "2026-10-12",
        productos: ["3 × Futaleufú — 150 gramos / Grano entero"],
      },
      {
        fecha: "2026-10-10",
        productos: ["2 × Futaleufú — 150 gramos / Molido"],
      },
    ]);
    expect(JSON.stringify(anteriores)).not.toMatch(/9990|\$/);
  });
});
