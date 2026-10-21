import { describe, expect, it } from "vitest";
import { DatosInvalidos } from "../../plataforma/errores.js";
import { validarPerfil } from "./perfil.js";

describe("el perfil de un café (sus notas de cata)", () => {
  it("se guarda sin espacios de más", () => {
    expect(
      validarPerfil({
        familia: " futaleufu ",
        notas: "  Chocolate y nuez; cuerpo medio.  ",
      }),
    ).toEqual({
      familia: "futaleufu",
      notas: "Chocolate y nuez; cuerpo medio.",
    });
  });

  it.each([
    ["", "Dulce", /familia/],
    ["futaleufu", "x".repeat(301), /300/],
    ["futaleufu", "Ideal para regalo, a $9.990", /montos/],
    ["futaleufu", "Sale 10 lucas", /montos/],
  ])("«%s» con «%s» no se acepta", (familia, notas, error) => {
    expect(() => validarPerfil({ familia, notas })).toThrow(DatosInvalidos);
    expect(() => validarPerfil({ familia, notas })).toThrow(error);
  });
});
