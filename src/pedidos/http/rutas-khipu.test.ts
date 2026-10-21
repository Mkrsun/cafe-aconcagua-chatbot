import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { pedir } from "../../plataforma/test-support/http.js";
import { KhipuFalso } from "../adaptadores/khipu-falso.js";
import { PedidosEnMemoria } from "../adaptadores/pedidos-en-memoria.js";
import { CobrarPedido } from "../casos-de-uso/cobrar-pedido.js";
import { ConciliarPago } from "../casos-de-uso/conciliar-pago.js";
import { RegistrarPedido } from "../casos-de-uso/registrar-pedido.js";
import { pedidoDePrueba } from "../test-support/pedido-de-prueba.js";
import { registrarWebhookDeKhipu } from "./rutas-khipu.js";

async function mundo() {
  const reloj = () => new Date("2026-10-16T12:00:00.000Z");
  const pedidos = new PedidosEnMemoria();
  const khipu = new KhipuFalso();
  await new RegistrarPedido({ pedidos, reloj }).ejecutar(pedidoDePrueba());
  await new CobrarPedido({ pedidos, reloj, proveedor: khipu }).ejecutar(
    "ped_1",
  );
  const app = new Hono();
  const conciliar = new ConciliarPago({
    pedidos,
    proveedor: khipu,
    reloj,
    alPagar: async () => {},
  });
  registrarWebhookDeKhipu(app, { conciliar });
  return { app, khipu };
}

describe("webhook de Khipu", () => {
  it("el webhook de Khipu consulta el pago y no cree en el cuerpo", async () => {
    const { app, khipu } = await mundo();
    const antes = await pedir(app, "POST", "/payments/khipu/webhook", {
      payment_id: "khipu_1",
    });
    expect(antes.cuerpo).toEqual({ confirmado: false });
    khipu.pagar("khipu_1");
    const despues = await pedir(app, "POST", "/payments/khipu/webhook", {
      providerPaymentId: "khipu_1",
    });
    expect(despues.cuerpo).toEqual({ confirmado: true });
    expect(
      (await pedir(app, "POST", "/payments/khipu/webhook", {})).status,
    ).toBe(400);
  });
});
