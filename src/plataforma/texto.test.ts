import { expect, it } from "vitest";
import { normalizar } from "./texto.js";
import { pesos } from "./pesos.js";
import { normalizarTelefono } from "./telefono.js";

it("normaliza sin tildes, mayúsculas, signos ni espacios repetidos", () => {
  expect(normalizar("  Ñuñoa,  ¡ALTO! ")).toBe("nunoa alto");
});

it("escribe pesos chilenos con punto de miles", () => {
  expect(pesos(12990)).toBe("$12.990");
  expect(pesos(1250000)).toBe("$1.250.000");
  expect(pesos(0)).toBe("$0");
});

it("normaliza teléfonos chilenos", () => {
  expect(normalizarTelefono("+56 9 1111 2222")).toBe("56911112222");
  expect(normalizarTelefono("9 1111 2222")).toBe("56911112222");
  expect(normalizarTelefono("56911112222")).toBe("56911112222");
});
