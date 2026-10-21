import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { EventoEntrante } from "../dominio/evento.js";
import { registrarWebhookDeWhatsApp } from "./webhook.js";

const SECRETO = "secreto-de-la-app";
const firmar = (cuerpo: string) =>
  `sha256=${createHmac("sha256", SECRETO).update(cuerpo).digest("hex")}`;
const cuerpo = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              { id: "w1", from: "569", type: "text", text: { body: "hola" } },
            ],
          },
        },
      ],
    },
  ],
});

function app(procesar = async (_e: readonly EventoEntrante[]) => true) {
  const recibidos: EventoEntrante[][] = [];
  const servidor = new Hono();
  registrarWebhookDeWhatsApp(servidor, {
    verifyToken: "verificar",
    appSecret: SECRETO,
    procesar: async (eventos) => {
      recibidos.push([...eventos]);
      return procesar(eventos);
    },
  });
  return { servidor, recibidos };
}

const post = (servidor: Hono, firma: string, texto = cuerpo) =>
  servidor.request("/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "x-hub-signature-256": firma,
      "content-type": "application/json",
    },
    body: texto,
  });

describe("webhook de WhatsApp", () => {
  it("responde el reto de verificación de Meta", async () => {
    const { servidor } = app();
    const ok = await servidor.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verificar&hub.challenge=123",
    );
    expect(await ok.text()).toBe("123");
    const malo = await servidor.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=123",
    );
    expect(malo.status).toBe(403);
  });

  it("con firma válida entrega los eventos y responde 200", async () => {
    const { servidor, recibidos } = app();
    const r = await post(servidor, firmar(cuerpo));
    expect(r.status).toBe(200);
    expect(recibidos[0]?.map((e) => e.id)).toEqual(["w1"]);
  });

  it("firma inválida 401, JSON inválido 400, fallo al recibir 500", async () => {
    expect((await post(app().servidor, "sha256=otra")).status).toBe(401);
    expect((await post(app().servidor, firmar("{no"), "{no")).status).toBe(400);
    const falla = app(async () => false);
    expect((await post(falla.servidor, firmar(cuerpo))).status).toBe(500);
  });

  it("sin token de verificación, WhatsApp no está configurado (404)", async () => {
    const servidor = new Hono();
    registrarWebhookDeWhatsApp(servidor, { procesar: async () => true });
    expect((await servidor.request("/webhooks/whatsapp")).status).toBe(404);
    expect((await post(servidor, "x")).status).toBe(404);
  });
});
