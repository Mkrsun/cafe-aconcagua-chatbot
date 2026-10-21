import { describe, expect, it } from "vitest";
import { fallosDelEscenario } from "./chequeos.js";
import type { Escenario, TurnoDelBanco } from "./escenario.js";

const escenario = (pasos: Escenario["pasos"]): Escenario => ({
  id: "caso",
  descripcion: "un caso",
  cliente: { nombre: "Ana", tipo: "minorista", tramo: "minorista" },
  pasos,
});

const turno = (extra: Partial<TurnoDelBanco>): TurnoDelBanco => ({
  cliente: ["hola"],
  chatbot: ["¡Hola! ¿En qué te ayudo?"],
  avisosAlEquipo: [],
  llamadas: [],
  termino: "respuesta",
  ...extra,
});

describe("los chequeos del banco", () => {
  it("un turno que termina como se esperaba y nombra lo pedido no falla", () => {
    const e = escenario([
      {
        cliente: "¿despachan a Puente Alto?",
        espera: "traspaso",
        menciona: [/Puente Alto/],
      },
    ]);
    const t = turno({
      termino: "traspaso",
      chatbot: [
        "A Puente Alto todavía no tengo una tarifa de despacho: le paso tu consulta…",
      ],
    });
    expect(fallosDelEscenario(e, [t])).toEqual([]);
  });

  it("marca cómo terminó si no es lo esperado, y lo que no nombró", () => {
    const e = escenario([
      { cliente: "hola", espera: "resumen", menciona: [/Ñuñoa/] },
    ]);
    expect(fallosDelEscenario(e, [turno({})])).toEqual([
      "turno 1: se esperaba resumen y terminó en respuesta",
      "turno 1: no menciona /Ñuñoa/",
    ]);
  });

  it("marca lo que nunca debe leer el cliente", () => {
    const e = escenario([{ cliente: "hola" }]);
    const t = turno({
      chatbot: ["Soy un bot. ¿Querés el SKU 0028? {{precio:0028}}\nTotal: $0"],
    });
    expect(fallosDelEscenario(e, [t])).toEqual([
      "turno 1: habla de bot, sistema o derivar",
      "turno 1: voseo",
      "turno 1: muestra un SKU",
      "turno 1: quedó un marcador sin resolver",
      "turno 1: resumen en $0",
    ]);
  });

  it("«botón» no cuenta como hablar de bot", () => {
    const e = escenario([{ cliente: "hola" }]);
    const t = turno({ chatbot: ["Aquí puedes pagarlo\n[botón «Pagar»]"] });
    expect(fallosDelEscenario(e, [t])).toEqual([]);
  });

  it("marca un mensaje demasiado largo para WhatsApp y un error del modelo", () => {
    const e = escenario([{ cliente: "qué cafés tienen?" }]);
    const t = turno({
      chatbot: ["café ".repeat(200)],
      llamadas: [
        { inputTokens: 1, outputTokens: 1, latenciaMs: 1, error: "http 500" },
      ],
    });
    expect(fallosDelEscenario(e, [t])).toEqual([
      "turno 1: mensaje de 1000 caracteres (más de 700)",
      "turno 1: el modelo falló (http 500)",
    ]);
  });
});
