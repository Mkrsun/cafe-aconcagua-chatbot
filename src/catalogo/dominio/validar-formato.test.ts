import { describe, expect, it } from "vitest";
import { DatosInvalidos } from "../../plataforma/errores.js";
import {
  validarCambios,
  validarFormatoNuevo,
  validarMonto,
} from "./validar-formato.js";

const valido = {
  sku: "0025",
  nombre: "Futaleufú 150 g",
  familia: "futaleufu",
  familiaNombre: "Futaleufú",
  gramaje: "150g",
};

describe("validación del catálogo", () => {
  it("acepta un formato completo y lo deja disponible por defecto", () => {
    expect(validarFormatoNuevo(valido)).toEqual({
      ...valido,
      disponible: true,
    });
  });

  it.each([
    [{ ...valido, sku: "con espacio" }],
    [{ ...valido, nombre: "x" }],
    [{ ...valido, familia: "Con Mayúsculas" }],
    [{ ...valido, familiaNombre: "" }],
  ])("rechaza datos inválidos %#", (datos) => {
    expect(() => validarFormatoNuevo(datos)).toThrow(DatosInvalidos);
  });

  it("los cambios solo tocan nombre, gramaje y disponibilidad", () => {
    expect(validarCambios({ nombre: "Nuevo nombre", sku: "otro" })).toEqual({
      nombre: "Nuevo nombre",
    });
    expect(() => validarCambios({ disponible: "sí" })).toThrow(DatosInvalidos);
  });

  it("un monto es un entero positivo o null (vuelve a pendiente)", () => {
    expect(validarMonto(12990)).toBe(12990);
    expect(validarMonto(null)).toBeNull();
    expect(() => validarMonto(0)).toThrow(DatosInvalidos);
    expect(() => validarMonto(12.5)).toThrow(DatosInvalidos);
    expect(() => validarMonto("12990")).toThrow(DatosInvalidos);
  });
});
