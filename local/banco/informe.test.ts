import { describe, expect, it } from "vitest";
import { informeEnMarkdown, resumenDeLlamadas } from "./informe.js";
import type { ResultadoDelEscenario } from "./escenario.js";

const resultado: ResultadoDelEscenario = {
  escenario: {
    id: "precio",
    descripcion: "Pregunta el precio",
    cliente: { nombre: "Tomás", tipo: "minorista", tramo: "minorista" },
    pasos: [{ cliente: "¿cuánto sale?" }],
  },
  turnos: [
    {
      cliente: ["¿cuánto sale?"],
      chatbot: ["Sale $9.990."],
      avisosAlEquipo: [],
      llamadas: [
        { inputTokens: 1000, outputTokens: 100, latenciaMs: 2000 },
        { inputTokens: 1000, outputTokens: 300, latenciaMs: 4000 },
      ],
      termino: "respuesta",
    },
  ],
  fallos: [],
};

describe("el informe del banco", () => {
  it("resume llamadas, tokens y latencias", () => {
    expect(resumenDeLlamadas([resultado])).toEqual({
      llamadas: 2,
      inputTokens: 2000,
      outputTokens: 400,
      latenciaMediaMs: 3000,
      latenciaMaximaMs: 4000,
      errores: 0,
    });
  });

  it("escribe cada conversación con lo que leyó el cliente y los fallos", () => {
    const md = informeEnMarkdown({
      modelo: "gpt-6-luna",
      esfuerzo: "medium",
      fecha: "2026-10-21",
      resultados: [{ ...resultado, fallos: ["turno 1: voseo"] }],
    });
    expect(md).toContain("# Banco de conversaciones — gpt-6-luna (medium)");
    expect(md).toContain("| Casos | 1 | Con fallos | 1 |");
    expect(md).toContain("### precio — Pregunta el precio");
    expect(md).toContain("> **Cliente:** ¿cuánto sale?");
    expect(md).toContain("> **Café:** Sale $9.990.");
    expect(md).toContain("- ⚠️ turno 1: voseo");
  });
});
