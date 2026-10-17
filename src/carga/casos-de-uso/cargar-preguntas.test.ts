import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { BaseDeFaq } from "../../faq/index.js";
import type { PreguntaDefinida } from "../dominio/definiciones.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarPreguntas } from "./cargar-preguntas.js";

const horario: PreguntaDefinida = {
  pregunta: "¿Cuál es el horario de atención?",
  respuesta: "De lunes a viernes, de 10:00 a 18:00.",
  tema: "horarios",
};
const retiro: PreguntaDefinida = {
  pregunta: "¿Puedo retirar en persona?",
  respuesta: "Sí, coordinamos el retiro por este chat.",
  tema: "pedidos",
};
const base = () =>
  new BaseDeFaq(
    new RegistrosEnMemoria(),
    () => new Date("2026-10-16T12:00:00Z"),
  );

describe("cargar las preguntas frecuentes", () => {
  it("crea y publica las que faltan; una carga igual no cambia nada", async () => {
    const faq = base();
    const r = resumenVacio();
    await cargarPreguntas(faq, [horario, retiro], r);
    expect(await faq.publicadas()).toEqual([
      { pregunta: horario.pregunta, respuesta: horario.respuesta },
      { pregunta: retiro.pregunta, respuesta: retiro.respuesta },
    ]);
    expect(r.cambios).toHaveLength(2);
    const otra = resumenVacio();
    await cargarPreguntas(faq, [horario, retiro], otra);
    expect(otra.cambios).toEqual([]);
  });

  it("cambia la respuesta de la misma pregunta y elimina la que ya no está", async () => {
    const faq = base();
    await cargarPreguntas(faq, [horario, retiro], resumenVacio());
    const r = resumenVacio();
    const nueva = {
      ...horario,
      respuesta: "De lunes a sábado, de 9:00 a 19:00.",
    };
    await cargarPreguntas(faq, [nueva], r);
    expect(await faq.publicadas()).toEqual([
      { pregunta: horario.pregunta, respuesta: nueva.respuesta },
    ]);
    expect(r.cambios).toEqual([
      `pregunta «${retiro.pregunta}» eliminada`,
      `pregunta «${horario.pregunta}» actualizada`,
    ]);
  });

  it("rechaza una respuesta con montos antes de escribir nada", async () => {
    const faq = base();
    await expect(
      cargarPreguntas(
        faq,
        [horario, { ...retiro, respuesta: "El retiro cuesta $2.000." }],
        resumenVacio(),
      ),
    ).rejects.toThrow(/precios/);
    expect(await faq.listar()).toEqual([]);
  });
});
