import type { Env, Hono } from "hono";
import type { ConciliarPago } from "../casos-de-uso/conciliar-pago.js";

/**
 * `POST /payments/khipu/webhook`. Pública por necesidad: Khipu llega sin credenciales.
 * El cuerpo nunca se cree: con el id se consulta a Khipu antes de dar un pago por hecho.
 */
export function registrarWebhookDeKhipu<E extends Env>(
  app: Hono<E>,
  { conciliar }: { readonly conciliar: ConciliarPago },
): void {
  app.post("/payments/khipu/webhook", async (c) => {
    const cuerpo = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const id = cuerpo.payment_id ?? cuerpo.providerPaymentId;
    if (typeof id !== "string" || !id.trim())
      return c.json({ error: "falta payment_id" }, 400);
    return c.json(await conciliar.ejecutar(id.trim()));
  });
}
