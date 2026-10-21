import { describe, expect, it } from "vitest";
import { Khipu } from "./khipu.js";

function conFetch(responder: (url: string) => Response) {
  const pedidos: {
    url: string;
    metodo: string;
    cuerpo?: unknown;
    clave?: string | null;
  }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({
      url: String(url),
      metodo: init?.method ?? "GET",
      ...(init?.body ? { cuerpo: JSON.parse(String(init.body)) } : {}),
      clave: new Headers(init?.headers).get("x-api-key"),
    });
    return responder(String(url));
  };
  return {
    pedidos,
    khipu: new Khipu({
      apiKey: "clave-khipu",
      base: "https://khipu.prueba/v3",
      notifyUrl: "https://cafe.example/payments/khipu/webhook",
      fetch,
    }),
  };
}

describe("Khipu (fetch falso)", () => {
  it("crea el cobro con el pedido como transaction_id y la URL de notificación", async () => {
    const { khipu, pedidos } = conFetch(() =>
      Response.json({
        payment_id: "k1",
        payment_url: "https://khipu.com/payment/info/k1",
      }),
    );
    expect(
      await khipu.crearCobro({
        referencia: "ped_1",
        montoClp: 23970,
        asunto: "Pedido",
      }),
    ).toEqual({
      id: "k1",
      url: "https://khipu.com/payment/info/k1",
    });
    expect(pedidos[0]).toEqual({
      url: "https://khipu.prueba/v3/payments",
      metodo: "POST",
      clave: "clave-khipu",
      cuerpo: {
        amount: 23970,
        currency: "CLP",
        subject: "Pedido",
        transaction_id: "ped_1",
        notify_url: "https://cafe.example/payments/khipu/webhook",
      },
    });
  });

  it("consulta el estado: done es pagado, con monto y referencia", async () => {
    const { khipu } = conFetch(() =>
      Response.json({ status: "done", amount: 23970, transaction_id: "ped_1" }),
    );
    expect(await khipu.consultar("k1")).toEqual({
      estado: "pagado",
      montoClp: 23970,
      referencia: "ped_1",
    });
    const pendiente = conFetch(() => Response.json({ status: "pending" }));
    expect(await pendiente.khipu.consultar("k1")).toEqual({
      estado: "pendiente",
    });
  });

  it("un error de Khipu al crear el cobro lanza", async () => {
    const { khipu } = conFetch(() => new Response("x", { status: 500 }));
    await expect(
      khipu.crearCobro({ referencia: "p", montoClp: 1, asunto: "x" }),
    ).rejects.toThrow(/HTTP 500/);
  });
});
