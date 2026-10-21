import { describe, expect, it } from "vitest";
import {
  conNotas,
  MAXIMO_DE_NOTAS,
  RECUERDO_VACIO,
  sinNota,
} from "./recuerdo.js";

const ahora = new Date("2026-10-20T15:00:00.000Z");

describe("el recuerdo de un cliente: notas breves entre conversaciones", () => {
  it("anota lo nuevo, sin repetir lo que ya sabe (aunque cambie la mayúscula)", () => {
    const r = conNotas(
      RECUERDO_VACIO,
      ["Prepara en prensa francesa", " Tiene un almacén en Recoleta "],
      ahora,
    );
    const otra = conNotas(
      r,
      ["prepara en prensa francesa", "Prefiere molido"],
      ahora,
    );
    expect(otra.notas.map((n) => n.texto)).toEqual([
      "Prepara en prensa francesa",
      "Tiene un almacén en Recoleta",
      "Prefiere molido",
    ]);
    expect(otra.notas[2]).toEqual({
      texto: "Prefiere molido",
      en: ahora.toISOString(),
    });
  });

  it("guarda las últimas notas, hasta el máximo", () => {
    const muchas = Array.from(
      { length: MAXIMO_DE_NOTAS + 3 },
      (_, i) => `Nota ${i + 1}`,
    );
    const r = conNotas(RECUERDO_VACIO, muchas, ahora);
    expect(r.notas).toHaveLength(MAXIMO_DE_NOTAS);
    expect(r.notas.at(-1)?.texto).toBe(`Nota ${MAXIMO_DE_NOTAS + 3}`);
  });

  it.each([
    ["Pagó $19.990 la última vez"],
    ["Su RUT es 12.345.678-9"],
    ["Su teléfono es +56 9 1234 5678"],
    ["Escribe a ana@correo.cl"],
    ["Mira https://ejemplo.cl"],
    ["x".repeat(141)],
    [""],
  ])("descarta lo que no debe guardar: «%s»", (texto) => {
    expect(conNotas(RECUERDO_VACIO, [texto], ahora).notas).toEqual([]);
  });

  it("olvida una nota por su número (desde 1) o todas", () => {
    const r = conNotas(RECUERDO_VACIO, ["Una", "Dos", "Tres"], ahora);
    expect(sinNota(r, 2).notas.map((n) => n.texto)).toEqual(["Una", "Tres"]);
    expect(sinNota(r).notas).toEqual([]);
  });
});
