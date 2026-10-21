import { describe, expect, it } from "vitest";
import { DatosInvalidos } from "../../plataforma/errores.js";
import { validarCambiosDeCliente, validarClienteNuevo } from "./cliente.js";
import { validarPolitica } from "./politica.js";

describe("validación del CRM", () => {
  it("un cliente nuevo con tipo, tramo y teléfonos normalizados", () => {
    expect(
      validarClienteNuevo({
        nombre: " Emporio Uno ",
        tipo: "mayorista-tienda",
        tramo: "mayorista",
        telefonos: ["+56 9 1111 2222"],
      }),
    ).toEqual({
      nombre: "Emporio Uno",
      tipo: "mayorista-tienda",
      tramo: "mayorista",
      telefonos: ["56911112222"],
    });
  });

  it.each([
    [{ nombre: "x", tipo: "minorista", tramo: "minorista", telefonos: [] }],
    [{ nombre: "Ana", tipo: "vip", tramo: "minorista", telefonos: [] }],
    [{ nombre: "Ana", tipo: "minorista", tramo: "oro", telefonos: [] }],
    [
      {
        nombre: "Ana",
        tipo: "minorista",
        tramo: "minorista",
        telefonos: ["12"],
      },
    ],
  ])("rechaza datos inválidos %#", (datos) => {
    expect(() => validarClienteNuevo(datos)).toThrow(DatosInvalidos);
  });

  it("los cambios aceptan el estado del cliente", () => {
    expect(validarCambiosDeCliente({ estado: "inactivo" })).toEqual({
      estado: "inactivo",
    });
    expect(() => validarCambiosDeCliente({ estado: "borrado" })).toThrow(
      DatosInvalidos,
    );
  });

  it("la política valida consentimiento, días y ventana horaria", () => {
    expect(
      validarPolitica({
        consentimiento: "otorgado",
        whatsapp: "retirado",
        fuente: "llamada",
      }),
    ).toMatchObject({
      consentimiento: "otorgado",
      whatsapp: "retirado",
      minDiasEntreContactos: 7,
      ventana: { desde: "09:00", hasta: "18:00" },
    });
    expect(() =>
      validarPolitica({ consentimiento: "si", fuente: "x" }),
    ).toThrow(DatosInvalidos);
    expect(() =>
      validarPolitica({ consentimiento: "granted", fuente: "llamada" }),
    ).toThrow("consentimiento debe ser desconocido, otorgado o retirado");
    expect(() =>
      validarPolitica({
        consentimiento: "otorgado",
        fuente: "x",
        minDiasEntreContactos: 0,
      }),
    ).toThrow(DatosInvalidos);
    expect(() =>
      validarPolitica({
        consentimiento: "otorgado",
        fuente: "x",
        ventana: { desde: "19:00", hasta: "09:00" },
      }),
    ).toThrow(DatosInvalidos);
  });
});
