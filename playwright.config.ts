import { defineConfig } from "@playwright/test";

/**
 * E2E del producto: el servidor real con su propia base `cafe_test_e2e_*` por prueba y dobles de
 * WhatsApp, del modelo y de Khipu. Sin navegador: el cliente es WhatsApp y el equipo usa la
 * terminal. Sin reintentos: una prueba inestable se arregla.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./e2e/.resultados/salida",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: Number(process.env.E2E_WORKERS ?? 2),
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./e2e/.resultados/html", open: "never" }],
  ],
});
