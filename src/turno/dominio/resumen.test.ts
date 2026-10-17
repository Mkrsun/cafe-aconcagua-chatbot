import { describe, expect, it } from "vitest";
import { fotoDePrueba } from "../test-support/catalogo-de-prueba.js";
import { cotizarLineas, PrecioPendiente } from "./cotizar.js";
import { textoDelResumen } from "./resumen.js";

const foto = fotoDePrueba();

describe("el resumen contractual", () => {
  it("cotiza con el tramo del cliente y suma el despacho al total", () => {
    const cotizado = cotizarLineas(
      [{ sku: "0025", cantidad: 2 }],
      foto,
      "minorista",
    );
    expect(cotizado.totalProductos).toBe(19980);
    const despacho = {
      zona: "Santiago oriente",
      montoClp: 3990,
      gratis: false,
      plazo: { desdeDias: 1, hastaDias: 2 },
    };
    expect(
      textoDelResumen({ lineas: cotizado.lineas, despacho, total: 23970 }),
    ).toBe(
      [
        "2 × Futaleufú — 150 gramos / Grano entero: $19.980",
        "Despacho a Santiago oriente: $3.990 (llega de 1 a 2 días hábiles después de salir)",
        "Total: $23.970",
        "¿Lo dejamos así?",
      ].join("\n"),
    );
  });

  it("un precio pendiente o un producto pausado no se cotiza", () => {
    expect(() =>
      cotizarLineas([{ sku: "0040", cantidad: 1 }], foto, "mayorista"),
    ).toThrow(PrecioPendiente);
    expect(() =>
      cotizarLineas([{ sku: "0088", cantidad: 1 }], foto, "minorista"),
    ).toThrow(PrecioPendiente);
  });
});
