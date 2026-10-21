import { describe, expect, it } from "vitest";
import { Conflicto } from "../../plataforma/errores.js";
import {
  pedidoConfirmado,
  primeraVersion,
  type PagoDelPedido,
} from "../dominio/pedido.js";
import type { IPedidos } from "../puertos/pedidos.js";
import { pedidoDePrueba } from "../test-support/pedido-de-prueba.js";

const ahora = new Date("2026-10-16T12:00:00.000Z");
const pago = (cambios: Partial<PagoDelPedido> = {}): PagoDelPedido => ({
  id: "pago_1",
  pedidoId: "ped_1",
  monto: 23970,
  estado: "pendiente",
  idEnKhipu: "khipu_1",
  url: "https://khipu.com/payment/info/khipu_1",
  creadoPor: "chatbot",
  creadoEn: ahora.toISOString(),
  ...cambios,
});

/** El contrato de los pedidos: el fake en memoria y PostgreSQL se comportan igual. */
export function contratoDePedidos(crear: () => Promise<IPedidos>) {
  describe("contrato de pedidos", () => {
    it("guarda el pedido con su versión y lo lee con la vigente", async () => {
      const pedidos = await crear();
      const nuevo = pedidoDePrueba();
      await pedidos.guardarVersion(primeraVersion(nuevo, ahora));
      await pedidos.guardarPedido(pedidoConfirmado(nuevo, ahora));
      const leido = await pedidos.obtener("ped_1");
      expect(leido?.pedido).toEqual(pedidoConfirmado(nuevo, ahora));
      expect(leido?.pedido).toMatchObject({
        id: "ped_1",
        estado: "confirmado",
        clienteId: "cli_1",
        conversacionId: "conv_1",
        creadoPor: "chatbot",
      });
      expect(leido?.version).toEqual(primeraVersion(nuevo, ahora));
      expect(leido?.version).toMatchObject({
        pedidoId: "ped_1",
        version: 1,
        total: 23970,
        lineas: nuevo.lineas,
        origen: { actor: "chatbot" },
      });
      expect(await pedidos.obtener("nada")).toBeUndefined();
    });

    it("una versión es inmutable", async () => {
      const pedidos = await crear();
      const version = primeraVersion(pedidoDePrueba(), ahora);
      await pedidos.guardarVersion(version);
      await expect(pedidos.guardarVersion(version)).rejects.toThrow(Conflicto);
      await expect(pedidos.guardarVersion(version)).rejects.toThrow(
        "version-existe",
      );
    });

    it("lista por cliente y estado, el más nuevo primero", async () => {
      const pedidos = await crear();
      for (const [id, clienteId, s] of [
        ["ped_1", "cli_1", 0],
        ["ped_2", "cli_2", 1],
        ["ped_3", "cli_1", 2],
      ] as const) {
        const nuevo = pedidoDePrueba({ id, clienteId });
        const en = new Date(ahora.getTime() + s * 1000);
        await pedidos.guardarVersion(primeraVersion(nuevo, en));
        await pedidos.guardarPedido(pedidoConfirmado(nuevo, en));
      }
      expect(
        (await pedidos.listar({ clienteId: "cli_1" })).map((p) => p.id),
      ).toEqual(["ped_3", "ped_1"]);
      expect(await pedidos.listar({ estado: "pagado" })).toEqual([]);
    });

    it("guardar de nuevo un pedido actualiza su estado", async () => {
      const pedidos = await crear();
      const confirmado = pedidoConfirmado(pedidoDePrueba(), ahora);
      await pedidos.guardarPedido(confirmado);
      const pagado = { ...confirmado, estado: "pagado" as const };
      await pedidos.guardarPedido(pagado);
      expect(await pedidos.listar({ estado: "pagado" })).toEqual([pagado]);
      expect(await pedidos.listar({ estado: "confirmado" })).toEqual([]);
    });

    it("guarda los pagos y los encuentra por pedido y por id en Khipu", async () => {
      const pedidos = await crear();
      await pedidos.guardarPago(pago());
      const verificado = pago({
        estado: "verificado",
        verificadoPor: "khipu",
        verificadoEn: ahora.toISOString(),
      });
      await pedidos.guardarPago(verificado);
      expect(await pedidos.pagosDe("ped_1")).toEqual([verificado]);
      expect(await pedidos.pagoPorReferencia("khipu_1")).toEqual(verificado);
      expect(await pedidos.pagoPorReferencia("otro")).toBeUndefined();
    });
  });
}
