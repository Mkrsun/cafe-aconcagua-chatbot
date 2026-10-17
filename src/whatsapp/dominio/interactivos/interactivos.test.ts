import { describe, expect, it } from "vitest";
import { eleccionEnTexto, textoDeEleccion } from "./eleccion.js";
import { textoEquivalente } from "./texto-equivalente.js";
import { validarContenido } from "./validar.js";

const botones = {
  tipo: "botones" as const,
  cuerpo: "¿Lo dejamos así?",
  opciones: [
    { id: "confirmar", titulo: "Confirmar" },
    { id: "cambiar", titulo: "Cambiar algo" },
  ],
};
const lista = {
  tipo: "lista" as const,
  cuerpo: "Estos son nuestros cafés:",
  boton: "Ver cafés",
  secciones: [
    {
      filas: [
        { id: "sku:0025", titulo: "Futaleufú 150 g", descripcion: "$9.990" },
      ],
    },
  ],
};

describe("contenido interactivo", () => {
  it("valida los límites de Cloud API", () => {
    expect(validarContenido(botones)).toEqual({ valido: true });
    const cuatro = {
      ...botones,
      opciones: [1, 2, 3, 4].map((n) => ({ id: `op:${n}`, titulo: `${n}` })),
    };
    expect(validarContenido(cuatro).valido).toBe(false);
    const largo = {
      ...botones,
      opciones: [{ id: "x", titulo: "a".repeat(21) }],
    };
    expect(validarContenido(largo).valido).toBe(false);
    expect(validarContenido(lista)).toEqual({ valido: true });
    const filaLarga = {
      ...lista,
      secciones: [{ filas: [{ id: "x", titulo: "a".repeat(25) }] }],
    };
    expect(validarContenido(filaLarga).valido).toBe(false);
    const enlace = {
      tipo: "enlace" as const,
      cuerpo: "Paga aquí",
      boton: "Pagar",
      url: "http://x",
    };
    expect(validarContenido(enlace).valido).toBe(false);
    expect(
      validarContenido({ ...enlace, url: "https://khipu.com/p/1" }).valido,
    ).toBe(true);
  });

  it("el texto equivalente no pierde información", () => {
    expect(textoEquivalente(botones)).toBe(
      "¿Lo dejamos así?\n\nResponde: Confirmar · Cambiar algo",
    );
    expect(textoEquivalente(lista)).toBe(
      "Estos son nuestros cafés:\n• Futaleufú 150 g — $9.990",
    );
    expect(
      textoEquivalente({
        tipo: "enlace",
        cuerpo: "Listo",
        boton: "Pagar",
        url: "https://k/1",
      }),
    ).toBe("Listo\nPagar: https://k/1");
    expect(
      textoEquivalente({
        tipo: "pedir-ubicacion",
        cuerpo: "¿A dónde lo enviamos?",
      }),
    ).toBe(
      "¿A dónde lo enviamos?\nPuedes escribirme la dirección y la comuna.",
    );
  });

  it("una elección entra al turno con su id estable y se lee de vuelta", () => {
    const texto = textoDeEleccion({ id: "confirmar", titulo: "Confirmar" });
    expect(texto).toBe("Confirmar [opción: confirmar]");
    expect(eleccionEnTexto(`hola\n${texto}`)).toEqual({
      id: "confirmar",
      titulo: "Confirmar",
      sinMarca: "hola\nConfirmar",
    });
    expect(eleccionEnTexto("sin marca")).toBeUndefined();
  });
});
