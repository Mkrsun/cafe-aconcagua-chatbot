import type { Hono } from "hono";

interface PagoKhipu {
  readonly id: string;
  readonly referencia: string;
  readonly monto: number;
  readonly estado: "pending" | "done";
}

/** El doble de Khipu (API v3): crea el cobro, lo informa y deja que la prueba lo marque pagado. */
export function crearKhipu() {
  const pagos = new Map<string, PagoKhipu>();
  return {
    registrar(app: Hono) {
      app.post("/khipu/v3/payments", async (c) => {
        const { amount, transaction_id } = await c.req.json<{
          amount: number;
          transaction_id: string;
        }>();
        const id = `khipu-e2e-${pagos.size + 1}`;
        pagos.set(id, {
          id,
          referencia: transaction_id,
          monto: amount,
          estado: "pending",
        });
        return c.json({
          payment_id: id,
          payment_url: `https://khipu.e2e.test/pagar/${id}`,
        });
      });
      app.get("/khipu/v3/payments/:id", (c) => {
        const pago = pagos.get(c.req.param("id"));
        if (!pago) return c.json({ message: "no existe" }, 404);
        return c.json({
          payment_id: pago.id,
          status: pago.estado,
          amount: pago.monto,
          transaction_id: pago.referencia,
        });
      });
      app.post("/__dobles/khipu/pagar", async (c) => {
        const { id } = await c.req.json<{ id: string }>();
        const pago = pagos.get(id);
        if (!pago) return c.json({ error: "pago desconocido" }, 404);
        pagos.set(id, { ...pago, estado: "done" });
        return c.json({ ok: true });
      });
      app.get("/__dobles/khipu/pagos", (c) => c.json([...pagos.values()]));
    },
  };
}
