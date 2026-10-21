import { readFileSync } from "node:fs";
import type { Hono } from "hono";

const ARCHIVOS = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/simulador/estilos.css": ["estilos.css", "text/css; charset=utf-8"],
  "/simulador/app.js": ["app.js", "text/javascript; charset=utf-8"],
} as const;

const leer = (archivo: string) =>
  readFileSync(new URL(`./pagina/${archivo}`, import.meta.url), "utf8");

/** La página del simulador: HTML, estilos y JS sin compilar, leídos en cada pedido. */
export function registrarPagina(app: Hono) {
  for (const [ruta, [archivo, tipo]] of Object.entries(ARCHIVOS))
    app.get(ruta, (c) =>
      c.body(leer(archivo), 200, {
        "content-type": tipo,
        "cache-control": "no-store",
      }),
    );
}
