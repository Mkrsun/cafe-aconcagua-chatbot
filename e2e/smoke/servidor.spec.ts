import { expect, test } from "../soporte/prueba.js";

/** Humo: el servidor arranca, responde la salud y solo expone los webhooks (sin admin ni API). */
test("solo la salud y los webhooks: sin admin ni API de operación", async ({
  cafe,
}) => {
  expect((await fetch(`${cafe.url}/salud`)).status).toBe(200);
  const verificacion = await fetch(
    `${cafe.url}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verificar&hub.challenge=42`,
  );
  expect(await verificacion.text()).toBe("42");
  for (const ruta of ["/", "/admin/", "/api/bandeja", "/api/catalogo"])
    expect((await fetch(`${cafe.url}${ruta}`)).status, ruta).toBe(404);
  expect(await cafe.bandeja()).toContain("Nadie espera a una persona.");
});
