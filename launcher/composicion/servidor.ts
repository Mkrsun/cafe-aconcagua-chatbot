import { Hono } from "hono";
import { registrarWebhookDeKhipu } from "../../src/pedidos/http/rutas-khipu.js";
import { registrarWebhookDeWhatsApp } from "../../src/whatsapp/http/webhook.js";
import type { Configuracion } from "../config/configuracion.js";
import type { Servicios } from "./servicios.js";

/**
 * El servidor HTTP: solo la salud y los dos webhooks, públicos por necesidad (Meta y Khipu llegan
 * sin credenciales; cada uno verifica a su manera). No hay API de operación: el equipo opera desde
 * la terminal (`pnpm cargar` y `pnpm bandeja`).
 */
export function crearServidor(config: Configuracion, s: Servicios) {
  const app = new Hono();
  app.get("/salud", (c) => c.json({ ok: true }));
  registrarWebhookDeWhatsApp(app, {
    ...(config.whatsapp ? { verifyToken: config.whatsapp.verifyToken } : {}),
    ...(config.whatsapp?.appSecret
      ? { appSecret: config.whatsapp.appSecret }
      : {}),
    procesar: (eventos) => s.recibir.ejecutar(eventos),
  });
  registrarWebhookDeKhipu(app, { conciliar: s.conciliar });
  return app;
}
