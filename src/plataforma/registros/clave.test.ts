import { expect, it } from "vitest";
import { claveDeRegistro } from "./puerto.js";

it("la clave son las partes en JSON: el mismo registro siempre da la misma clave", () => {
  expect(claveDeRegistro("llm-gasto-mensual", "2026-10")).toBe(
    '["llm-gasto-mensual","2026-10"]',
  );
});
