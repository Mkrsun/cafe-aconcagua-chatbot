import { describe, expect, it } from "vitest";
import { KhipuFalso } from "../adaptadores/khipu-falso.js";
import { PedidosEnMemoria } from "../adaptadores/pedidos-en-memoria.js";
import { pedidoDePrueba } from "../test-support/pedido-de-prueba.js";
import { CobrarPedido } from "./cobrar-pedido.js";
import { ConciliarPago } from "./conciliar-pago.js";
import { RegistrarPedido } from "./registrar-pedido.js";

const reloj = () => new Date("2026-10-16T12:00:00.000Z");

function mundo(conKhipu = true) {
  const pedidos = new PedidosEnMemoria();
  const khipu = new KhipuFalso();
  const pagados: string[] = [];
  return {
    pedidos,
    khipu,
    pagados,
    registrar: new RegistrarPedido({ pedidos, reloj }),
    cobrar: new CobrarPedido({
      pedidos,
      reloj,
      ...(conKhipu ? { proveedor: khipu } : {}),
    }),
    conciliar: new ConciliarPago({
      pedidos,
      proveedor: khipu,
      reloj,
      alPagar: async (pedidoId) => void pagados.push(pedidoId),
    }),
  };
}

describe("registrar y cobrar un pedido", () => {
  it("registrar es idempotente por el id del pedido", async () => {
    const { registrar, pedidos } = mundo();
    await registrar.ejecutar(pedidoDePrueba());
    await registrar.ejecutar(pedidoDePrueba());
    expect(await pedidos.listar({})).toHaveLength(1);
  });

  it("cobrar crea un enlace de Khipu por el total y deja el pedido pendiente de pago", async () => {
    const { registrar, cobrar, pedidos } = mundo();
    await registrar.ejecutar(pedidoDePrueba());
    const enlace = await cobrar.ejecutar("ped_1");
    expect(enlace).toEqual({
      url: "https://khipu.com/payment/info/khipu_1",
      montoClp: 23970,
    });
    expect((await pedidos.obtener("ped_1"))?.pedido.estado).toBe(
      "pago_pendiente",
    );
    expect(await cobrar.ejecutar("ped_1")).toEqual(enlace);
    expect(await pedidos.pagosDe("ped_1")).toHaveLength(1);
  });

  it("sin Khipu no hay enlace: el pedido queda confirmado para la encargada", async () => {
    const { registrar, cobrar, pedidos } = mundo(false);
    await registrar.ejecutar(pedidoDePrueba());
    expect(await cobrar.ejecutar("ped_1")).toBeUndefined();
    expect((await pedidos.obtener("ped_1"))?.pedido.estado).toBe("confirmado");
  });
});

describe("conciliar un pago de Khipu", () => {
  it("un pago hecho por el total marca el pedido pagado y avisa una sola vez", async () => {
    const m = mundo();
    await m.registrar.ejecutar(pedidoDePrueba());
    await m.cobrar.ejecutar("ped_1");
    expect(await m.conciliar.ejecutar("khipu_1")).toEqual({
      confirmado: false,
    });
    m.khipu.pagar("khipu_1");
    expect(await m.conciliar.ejecutar("khipu_1")).toEqual({ confirmado: true });
    expect(await m.conciliar.ejecutar("khipu_1")).toEqual({ confirmado: true });
    expect(m.pagados).toEqual(["ped_1"]);
    expect((await m.pedidos.obtener("ped_1"))?.pedido.estado).toBe("pagado");
    expect((await m.pedidos.pagosDe("ped_1"))[0]).toMatchObject({
      estado: "verificado",
    });
  });

  it("un monto distinto o un pago desconocido no tienen efecto", async () => {
    const m = mundo();
    await m.registrar.ejecutar(pedidoDePrueba());
    await m.cobrar.ejecutar("ped_1");
    m.khipu.pagar("khipu_1", 100);
    expect(await m.conciliar.ejecutar("khipu_1")).toEqual({
      confirmado: false,
    });
    expect(await m.conciliar.ejecutar("khipu_99")).toEqual({
      confirmado: false,
    });
    expect(m.pagados).toEqual([]);
  });
});
