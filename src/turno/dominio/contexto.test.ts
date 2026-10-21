import { describe, expect, it } from "vitest";
import { fotoDePrueba } from "../test-support/catalogo-de-prueba.js";
import { armarContexto } from "./contexto.js";
import { ESTADO_INICIAL } from "./estado.js";

const entrada = {
  foto: fotoDePrueba(),
  estado: ESTADO_INICIAL,
  cliente: { nombre: "Ana", tipo: "minorista", tramo: "minorista" as const },
  faq: [],
  zonas: [],
  texto: "¿atienden hoy?",
  ahora: new Date("2026-10-20T15:00:00.000Z"),
};

describe("el contexto de una inferencia", () => {
  it("el turno lleva el momento en Chile; las reglas no cambian con él (prefijo cacheable)", () => {
    const hoy = armarContexto(entrada);
    const manana = armarContexto({
      ...entrada,
      ahora: new Date("2026-10-21T15:00:00.000Z"),
    });
    expect(JSON.parse(hoy.user).ahora).toBe("martes 20 de octubre, 12:00");
    expect(manana.system).toBe(hoy.system);
  });

  it("el catálogo del prefijo no trae montos ni el tramo del cliente", () => {
    const { system } = armarContexto(entrada);
    expect(system).toContain(
      "futaleufu | 0025 | Futaleufú — 150 gramos / Grano entero",
    );
    expect(system).not.toMatch(/\$\s?\d|9\.?990/);
  });
});
