import { test as base, expect } from "@playwright/test";
import { decision } from "../soporte/decisiones.js";
import { arrancarModoLocal } from "../soporte/modo-local.js";

const test = base.extend<{
  local: Awaited<ReturnType<typeof arrancarModoLocal>>;
}>({
  local: async ({}, usar, info) => {
    const local = await arrancarModoLocal(
      `sim_${info.workerIndex}_${info.testId}`,
    );
    try {
      await usar(local);
    } finally {
      if (info.status !== info.expectedStatus)
        await info.attach("salida-de-pnpm-local", { body: local.salida() });
      await local.cerrar();
    }
  },
});

const guionar = (modelo: string, decisiones: object[]) =>
  fetch(`${modelo}/__dobles/modelo/guion`, {
    method: "POST",
    body: JSON.stringify({ cliente: "Ana Pérez", decisiones }),
  });

/**
 * El simulador de `pnpm local` en un navegador: Rodo escribe como Ana, elige de la lista, confirma
 * con el botón, simula el pago y ve el gasto del modelo; después pide una persona y la atiende
 * desde la bandeja del mismo panel.
 */
test("pedido completo y traspaso atendido, todo desde el simulador", async ({
  page,
  local,
}) => {
  await guionar(local.modelo, [
    decision({
      knownRefs: ["0025", "0028"],
      forma: { tipo: "lista", opciones: [], skus: ["0025", "0028"] },
      response: "¡Hola, Ana! Estos son nuestros Futaleufú:",
    }),
    decision({
      action: "PROPONER",
      changes: [{ sku: "0028", cantidad: 2 }],
      despacho: "Ñuñoa",
      response: "¡Buenísimo, Ana! Te dejo el resumen:",
    }),
  ]);
  await page.goto(local.simulador);
  const hilo = page.getByRole("list", { name: "Conversación" });
  const mensaje = page.getByLabel("Mensaje");

  await mensaje.fill("hola, ¿qué futaleufú tienen?");
  await mensaje.press("Enter");
  await expect(page.getByRole("status").first()).toHaveText(
    /espera|escribiendo/,
  );
  await expect(hilo).toContainText("Estos son nuestros Futaleufú");
  await expect(hilo).toContainText("$9.990");

  await hilo.getByRole("button", { name: /Molido/ }).click();
  await expect(hilo).toContainText("Total: $23.970", { timeout: 15_000 });
  await hilo.getByRole("button", { name: "Confirmar" }).click();
  await expect(hilo).toContainText("Pagar");
  await page.getByRole("button", { name: /Simular pago/ }).click();
  await expect(hilo).toContainText("payment_received");

  const gasto = page.locator("#gasto");
  await expect(gasto).toContainText("Llamadas al modelo");
  await expect(gasto).toContainText("2");
  await expect(gasto).toContainText("US$");

  await mensaje.fill("quiero hablar con una persona");
  await mensaje.press("Enter");
  const bandeja = page.getByRole("list", { name: "Conversaciones abiertas" });
  await expect(bandeja).toContainText("Espera a una persona", {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("list", { name: "Avisos al equipo" }),
  ).toContainText("Ana Pérez");
  await page
    .getByLabel("Respuesta para Ana Pérez")
    .fill("Hola Ana, te ayudo yo");
  await bandeja.getByRole("button", { name: "Responder" }).click();
  await expect(hilo).toContainText("Hola Ana, te ayudo yo");
  await expect(bandeja).toContainText("La lleva Rodo");
  await bandeja.getByRole("button", { name: /Resolver/ }).click();
  await expect(bandeja).toContainText("No hay conversaciones abiertas.");
});
