import { createHmac, timingSafeEqual } from "node:crypto";
import type { Env, Hono } from "hono";
import type { EventoEntrante } from "../dominio/evento.js";
import { extraerEventos } from "./eventos-de-meta.js";

export interface DepsWebhook {
  /** Sin token, las rutas responden 404: WhatsApp no está configurado. */
  readonly verifyToken?: string;
  /** Secreto de la app para `X-Hub-Signature-256` (obligatorio en producción). */
  readonly appSecret?: string;
  /** Recibe los mensajes (bandeja y cola); `false` si alguno falló y Meta debe reintentar. */
  readonly procesar: (eventos: readonly EventoEntrante[]) => Promise<boolean>;
}

/** Compara la firma `sha256=<hmac>` de Meta en tiempo constante. */
function firmaValida(cuerpo: string, secreto: string, recibida: string) {
  const esperada = Buffer.from(
    `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`,
  );
  const dada = Buffer.from(recibida);
  return dada.length === esperada.length && timingSafeEqual(dada, esperada);
}

/**
 * `GET|POST /webhooks/whatsapp`. Pública por necesidad: Meta llega sin credenciales y
 * la firma es la autenticación. Responde apenas los mensajes quedan en la bandeja y la cola.
 */
export function registrarWebhookDeWhatsApp<E extends Env>(
  app: Hono<E>,
  deps: DepsWebhook,
): void {
  const { verifyToken, appSecret } = deps;

  app.get("/webhooks/whatsapp", (c) => {
    if (!verifyToken) return c.text("WhatsApp no configurado", 404);
    const reto = c.req.query("hub.challenge");
    const valida =
      c.req.query("hub.mode") === "subscribe" &&
      c.req.query("hub.verify_token") === verifyToken &&
      !!reto;
    return valida ? c.text(reto) : c.text("verificación inválida", 403);
  });

  app.post("/webhooks/whatsapp", async (c) => {
    if (!verifyToken) return c.json({ error: "WhatsApp no configurado" }, 404);
    const crudo = await c.req.text();
    if (
      appSecret &&
      !firmaValida(crudo, appSecret, c.req.header("x-hub-signature-256") ?? "")
    )
      return c.json({ error: "firma inválida" }, 401);
    let payload: unknown;
    try {
      payload = JSON.parse(crudo);
    } catch {
      return c.json({ error: "JSON inválido" }, 400);
    }
    const eventos = extraerEventos(payload);
    return (await deps.procesar(eventos))
      ? c.json({ recibido: true, mensajes: eventos.length })
      : c.json({ error: "error procesando el mensaje" }, 500);
  });
}
