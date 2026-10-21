import type { Hono } from "hono";

/** Una petición JSON a la app, con su estado y su cuerpo ya leído. */
export async function pedir(
  app: Pick<Hono, "request">,
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
  encabezados: Record<string, string> = {},
) {
  const respuesta = await app.request(ruta, {
    method: metodo,
    headers: { "content-type": "application/json", ...encabezados },
    ...(cuerpo === undefined || metodo === "GET"
      ? {}
      : { body: JSON.stringify(cuerpo) }),
  });
  const texto = await respuesta.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- el cuerpo es JSON libre
  const json: any = texto ? JSON.parse(texto) : undefined;
  return { status: respuesta.status, cuerpo: json };
}
