import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { crearGraph } from "./graph.js";
import { crearKhipu } from "./khipu.js";
import { crearModelo } from "./modelo.js";

export interface Dobles {
  /** La base de los dobles; el producto los conoce solo por estas URL. */
  readonly base: string;
  cerrar(): Promise<void>;
}

interface Doble {
  registrar(app: Hono): void;
}

export interface OpcionesDeLosDobles {
  /** 0 (por defecto) toma un puerto libre. */
  readonly puerto?: number;
  /** Por defecto, los tres; el modo local deja el modelo real. */
  readonly dobles?: readonly Doble[];
}

/**
 * WhatsApp (Graph), el modelo y Khipu en un servidor HTTP aparte, fuera del proceso del producto,
 * más la API de control `/__dobles/*` con la que la prueba guiona y mira lo que pasó.
 */
export async function iniciarDobles({
  puerto = 0,
  dobles = [crearGraph(), crearModelo(), crearKhipu()],
}: OpcionesDeLosDobles = {}): Promise<Dobles> {
  const app = new Hono();
  for (const doble of dobles) doble.registrar(app);
  const servidor = await new Promise<ReturnType<typeof serve>>(
    (listo, fallo) => {
      const s = serve(
        { fetch: app.fetch, hostname: "127.0.0.1", port: puerto },
        () => listo(s),
      );
      s.once("error", fallo);
    },
  );
  const { port } = servidor.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    cerrar: () => new Promise((cerrado) => servidor.close(() => cerrado())),
  };
}
