import { beforeEach, describe, expect, it } from "vitest";
import {
  Conflicto,
  DatosInvalidos,
  NoEncontrado,
} from "../../plataforma/errores.js";
import { claveDeRegistro } from "../../plataforma/registros/puerto.js";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { BaseDeFaq } from "./base-de-faq.js";

const horario = {
  pregunta: "¿Cuál es el horario de retiro?",
  respuesta: "De lunes a viernes de 10:00 a 14:00.",
  tema: "horarios",
};

describe("la base de preguntas frecuentes", () => {
  let registros: RegistrosEnMemoria;
  let base: BaseDeFaq;

  beforeEach(() => {
    registros = new RegistrosEnMemoria();
    base = new BaseDeFaq(registros, () => new Date("2026-10-16T12:00:00.000Z"));
  });

  it("crea un borrador, lo edita con su versión y lo publica", async () => {
    const borrador = await base.crear(horario, "Glei");
    expect(borrador).toMatchObject({
      estado: "borrador",
      version: 1,
      actualizadoPor: "Glei",
    });
    expect(await base.publicadas()).toEqual([]);
    const editada = await base.editar(
      borrador.id,
      { respuesta: "De 9:00 a 13:00." },
      1,
      "Glei",
    );
    expect(editada.version).toBe(2);
    await expect(
      base.editar(borrador.id, { tema: "general" }, 1, "Rodo"),
    ).rejects.toThrow(Conflicto);
    await base.publicar(borrador.id, 2, "Glei");
    expect(await base.publicadas()).toEqual([
      { pregunta: horario.pregunta, respuesta: "De 9:00 a 13:00." },
    ]);
  });

  it("no publica sin respuesta ni repite preguntas", async () => {
    const vacia = await base.crear({ ...horario, respuesta: "" }, "Glei");
    await expect(base.publicar(vacia.id, 1, "Glei")).rejects.toThrow(
      DatosInvalidos,
    );
    await expect(
      base.crear(
        { ...horario, pregunta: "cual es el horario de retiro" },
        "Glei",
      ),
    ).rejects.toThrow(Conflicto);
  });

  it("despublica, elimina y deja todo en el historial", async () => {
    const e = await base.crear(horario, "Glei");
    await base.publicar(e.id, 1, "Glei");
    await base.despublicar(e.id, 2, "Rodo");
    await base.eliminar(e.id, 3, "Rodo");
    expect(await base.listar()).toEqual([]);
    expect((await base.historial()).map((c) => c.accion)).toEqual([
      "eliminada",
      "despublicada",
      "publicada",
      "creada",
    ]);
    await expect(base.eliminar(e.id, 3, "Rodo")).rejects.toThrow(NoEncontrado);
  });
});
