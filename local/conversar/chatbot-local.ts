import type { MensajeEnviado, VistoEnviado } from "../../e2e/dobles/graph.js";
import { webhookFirmado, type MensajeDeMeta } from "./webhook.js";

interface PagoDelDoble {
  readonly id: string;
  readonly estado: "pending" | "done";
}

/** El modo local visto desde el teléfono del cliente: el webhook del servidor y los dobles. */
export class ChatbotLocal {
  constructor(
    private readonly servidor: string,
    private readonly dobles: string,
    private readonly secreto: string,
  ) {}

  async disponible(): Promise<boolean> {
    return fetch(`${this.servidor}/salud`)
      .then((r) => r.ok)
      .catch(() => false);
  }

  /** Lo que Meta le manda al webhook cuando el cliente escribe. */
  async enviar(mensaje: MensajeDeMeta): Promise<void> {
    const { cuerpo, encabezados } = webhookFirmado([mensaje], this.secreto);
    const r = await fetch(`${this.servidor}/webhooks/whatsapp`, {
      method: "POST",
      headers: encabezados,
      body: cuerpo,
    });
    if (!r.ok) throw new Error(`el webhook respondió ${r.status}`);
  }

  async enviados(): Promise<MensajeEnviado[]> {
    return (await fetch(`${this.dobles}/__dobles/graph/enviados`)).json();
  }

  async leidos(): Promise<VistoEnviado[]> {
    return (await fetch(`${this.dobles}/__dobles/graph/leidos`)).json();
  }

  /** Khipu confirma el último cobro pendiente y avisa al servidor; sin cobro, `undefined`. */
  async pagarUltimo(): Promise<string | undefined> {
    const pagos: PagoDelDoble[] = await (
      await fetch(`${this.dobles}/__dobles/khipu/pagos`)
    ).json();
    const pago = pagos.filter((p) => p.estado === "pending").at(-1);
    if (!pago) return undefined;
    await fetch(`${this.dobles}/__dobles/khipu/pagar`, {
      method: "POST",
      body: JSON.stringify({ id: pago.id }),
    });
    await fetch(`${this.servidor}/payments/khipu/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payment_id: pago.id }),
    });
    return pago.id;
  }
}
