import { describe, expect, it } from "vitest";
import { DatosInvalidos } from "../../plataforma/errores.js";
import { contieneMonto } from "./contiene-monto.js";
import { clavePregunta, validarDatos } from "./entrada.js";

describe("la regla «sin montos» de la FAQ", () => {
  it.each([
    "El despacho cuesta $3.990",
    "Son 5.000 pesos",
    "Te sale en 5 lucas",
    "CLP 12990",
    "El precio del kilo es 25",
    "Gratis sobre 30.000",
    "dos mil pesos",
  ])("«%s» trae un monto", (texto) => {
    expect(contieneMonto(texto)).toBe(true);
  });

  it.each([
    "Atendemos de lunes a viernes de 10:00 a 14:00",
    "Escríbenos al +56 9 1111 2222",
    "Estamos en Av. Italia 1234, Ñuñoa",
    "Despachamos en 2 a 3 días hábiles",
  ])("«%s» no es un monto", (texto) => {
    expect(contieneMonto(texto)).toBe(false);
  });
});

describe("validar una entrada", () => {
  it("limpia y acepta una pregunta con su tema", () => {
    expect(
      validarDatos({
        pregunta: " ¿Dónde están? ",
        respuesta: "En Ñuñoa.",
        tema: "ubicacion",
      }),
    ).toEqual({
      pregunta: "¿Dónde están?",
      respuesta: "En Ñuñoa.",
      tema: "ubicacion",
    });
  });

  it("rechaza montos, temas desconocidos y largos fuera de rango", () => {
    const base = { pregunta: "¿Cuánto cuesta el despacho?", tema: "despacho" };
    expect(() => validarDatos({ ...base, respuesta: "$3.990" })).toThrow(
      "Los precios salen del catálogo; no se escriben en la FAQ",
    );
    expect(() =>
      validarDatos({ ...base, respuesta: "", tema: "reservas" }),
    ).toThrow(DatosInvalidos);
    expect(() => validarDatos({ ...base, pregunta: "¿?" })).toThrow(
      DatosInvalidos,
    );
    expect(() => validarDatos({ ...base, respuesta: "x".repeat(801) })).toThrow(
      DatosInvalidos,
    );
  });

  it("dos preguntas iguales salvo tildes y signos tienen la misma clave", () => {
    expect(clavePregunta("¿Dónde están?")).toBe(clavePregunta("donde estan"));
  });
});
