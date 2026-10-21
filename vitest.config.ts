import { defineConfig } from "vitest/config";

/**
 * Las pruebas de PostgreSQL se saltan solas sin `DATABASE_URL`. Con base, corren en serie: comparten
 * tablas y cada suite las vacía al empezar.
 */
export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "launcher/**/*.test.ts",
      "local/**/*.test.ts",
    ],
    fileParallelism: !process.env.DATABASE_URL,
    passWithNoTests: true,
  },
});
