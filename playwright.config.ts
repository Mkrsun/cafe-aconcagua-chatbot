import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// El Chromium preinstalado del entorno (solo lo usa la suite del simulador); en CI se instala.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/opt/pw-browsers"))
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";

/**
 * E2E del producto: el servidor real con su propia base `cafe_test_e2e_*` por prueba y dobles de
 * WhatsApp, del modelo y de Khipu. `smoke` y `critical` no abren navegador (el cliente es WhatsApp
 * y el equipo usa la terminal); `simulador` prueba la página de `pnpm local` en Chromium. Sin
 * reintentos: una prueba inestable se arregla.
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
  use: { locale: "es-CL", timezoneId: "America/Santiago" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
