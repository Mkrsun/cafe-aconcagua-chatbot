import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { EventoEntrante } from "../../src/whatsapp/dominio/evento.js";
import { registrarWebhookDeWhatsApp } from "../../src/whatsapp/http/webhook.js";
import {
  mensajeDeEleccion,
  mensajeDeTexto,
  mensajeDeUbicacion,
  webhookFirmado,
} from "./webhook.js";

const SECRETO = "secreto-de-prueba";
const ANA = "56911112222";

/** El webhook real del producto: valida la firma y entrega los eventos que leyó. */
async function recibir(cuerpo: string, encabezados: Record<string, string>) {
  const eventos: EventoEntrante[] = [];
  const app = new Hono();
  registrarWebhookDeWhatsApp(app, {
    verifyToken: "verificar",
    appSecret: SECRETO,
    procesar: async (e) => (eventos.push(...e), true),
  });
  const r = await app.request("/webhooks/whatsapp", {
    method: "POST",
    headers: encabezados,
    body: cuerpo,
  });
  return { status: r.status, eventos };
}

describe("el webhook firmado que arma la CLI", () => {
  it("un texto tiene la forma de Meta y su firma valida con el secreto", async () => {
    const m = mensajeDeTexto(ANA, "hola, ¿qué cafés tienen?");
    const { cuerpo, encabezados } = webhookFirmado([m], SECRETO);
    expect(JSON.parse(cuerpo)).toEqual({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: { messaging_product: "whatsapp", messages: [m] },
            },
          ],
        },
      ],
    });
    expect(encabezados["x-hub-signature-256"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    const { status, eventos } = await recibir(cuerpo, encabezados);
    expect(status).toBe(200);
    expect(eventos).toEqual([
      {
        id: m.id,
        telefono: ANA,
        tipo: "text",
        texto: "hola, ¿qué cafés tienen?",
      },
    ]);
  });

  it("con otro secreto el producto lo rechaza", async () => {
    const { cuerpo, encabezados } = webhookFirmado(
      [mensajeDeTexto(ANA, "hola")],
      "otro-secreto",
    );
    expect((await recibir(cuerpo, encabezados)).status).toBe(401);
  });

  it("cada mensaje lleva un id propio", () => {
    expect(mensajeDeTexto(ANA, "a").id).not.toBe(mensajeDeTexto(ANA, "a").id);
  });

  it("elegir un botón o una fila de lista llega como la respuesta interactiva", async () => {
    const boton = mensajeDeEleccion(ANA, {
      origen: "boton",
      id: "confirmar",
      titulo: "Confirmar",
    });
    const fila = mensajeDeEleccion(ANA, {
      origen: "lista",
      id: "sku:0028",
      titulo: "Futaleufú molido",
      descripcion: "$9.990",
    });
    const { cuerpo, encabezados } = webhookFirmado([boton, fila], SECRETO);
    const { eventos } = await recibir(cuerpo, encabezados);
    expect(eventos.map((e) => e.entrante)).toEqual([
      {
        tipo: "eleccion",
        origen: "boton",
        eleccion: { id: "confirmar", titulo: "Confirmar" },
      },
      {
        tipo: "eleccion",
        origen: "lista",
        eleccion: {
          id: "sku:0028",
          titulo: "Futaleufú molido",
          descripcion: "$9.990",
        },
      },
    ]);
  });

  it("compartir la ubicación de ejemplo llega como una ubicación en Ñuñoa", async () => {
    const { cuerpo, encabezados } = webhookFirmado(
      [mensajeDeUbicacion(ANA)],
      SECRETO,
    );
    const [evento] = (await recibir(cuerpo, encabezados)).eventos;
    expect(evento?.tipo).toBe("location");
    expect(evento?.entrante).toMatchObject({
      tipo: "ubicacion",
      ubicacion: { nombre: expect.stringContaining("Ñuñoa") },
    });
  });
});
