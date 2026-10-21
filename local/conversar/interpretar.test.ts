import { describe, expect, it } from "vitest";
import { interpretarLinea } from "./interpretar.js";
import type { OpcionElegible } from "./mostrar.js";

const OPCIONES: OpcionElegible[] = [
  { origen: "boton", id: "confirmar", titulo: "Confirmar" },
  { origen: "boton", id: "cambiar", titulo: "Cambiar algo" },
];

describe("qué hace la CLI con cada línea", () => {
  it("un número elige esa opción del último mensaje interactivo", () => {
    expect(interpretarLinea(" 2 ", OPCIONES)).toEqual({
      tipo: "eleccion",
      opcion: OPCIONES[1],
    });
  });

  it("un número fuera de rango, o sin opciones, es un texto", () => {
    expect(interpretarLinea("3", OPCIONES)).toEqual({
      tipo: "texto",
      texto: "3",
    });
    expect(interpretarLinea("1", [])).toEqual({ tipo: "texto", texto: "1" });
  });

  it("reconoce los comandos y deja pasar el texto", () => {
    expect(interpretarLinea("/pagar", OPCIONES)).toEqual({ tipo: "pagar" });
    expect(interpretarLinea("/ubicacion", [])).toEqual({ tipo: "ubicacion" });
    expect(interpretarLinea("/ayuda", [])).toEqual({ tipo: "ayuda" });
    expect(interpretarLinea("/salir", [])).toEqual({ tipo: "salir" });
    expect(interpretarLinea("   ", [])).toEqual({ tipo: "nada" });
    expect(interpretarLinea("hola", OPCIONES)).toEqual({
      tipo: "texto",
      texto: "hola",
    });
  });
});
