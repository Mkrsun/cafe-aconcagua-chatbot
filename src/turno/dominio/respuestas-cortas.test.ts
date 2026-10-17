import { describe, expect, it } from "vitest";
import { senalesDeEnojo } from "./animo.js";
import { clasificarRespuestaBreve } from "./respuesta-breve.js";

describe("respuestas breves a la chilena", () => {
  it.each([
    "sipo",
    "ya po",
    "Ya",
    "listo",
    "dale",
    "👍",
    "👍🏽",
    "sí gracias",
    "Siii",
    "bacán, sí",
  ])("«%s» es afirmativo", (t) =>
    expect(clasificarRespuestaBreve(t)?.tipo).toBe("afirmativo"),
  );
  it.each(["no po", "mejor no", "no, gracias", "nop"])(
    "«%s» es negativo",
    (t) => expect(clasificarRespuestaBreve(t)?.tipo).toBe("negativo"),
  );
  it.each(["gracias", "muchas gracias", "chao", "🙏", "ya, chao"])(
    "«%s» es cierre",
    (t) => expect(clasificarRespuestaBreve(t)?.tipo).toBe("cierre"),
  );
  it.each(["mmm puede ser", "sí pero cámbiame uno", "no sé", "¿listo?"])(
    "«%s» lo interpreta el modelo",
    (t) => expect(clasificarRespuestaBreve(t)).toBeUndefined(),
  );
});

describe("señales de enojo (solo lo inequívoco)", () => {
  it("pedir una persona o insultar escala siempre", () => {
    expect(
      senalesDeEnojo({
        texto: "quiero hablar con una persona",
        enReclamo: false,
      }),
    ).toEqual(["pide-persona"]);
    expect(
      senalesDeEnojo({ texto: "ustedes son unos ladrones", enReclamo: false }),
    ).toContain("insulto");
  });

  it("las mayúsculas solo cuentan dentro de un reclamo", () => {
    expect(
      senalesDeEnojo({
        texto: "QUIERO CUATRO FUTALEUFU MOLIDO",
        enReclamo: false,
      }),
    ).toEqual([]);
    expect(
      senalesDeEnojo({ texto: "ME LLEGÓ TODO ROTO OTRA VEZ", enReclamo: true }),
    ).toContain("mayusculas");
  });

  it("preguntar si atienden el sábado no es pedir una persona", () => {
    expect(
      senalesDeEnojo({
        texto: "¿me atiende alguien el sábado?",
        enReclamo: false,
      }),
    ).toEqual([]);
  });
});
