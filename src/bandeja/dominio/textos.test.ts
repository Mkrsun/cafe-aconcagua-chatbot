import { describe, expect, it } from "vitest";
import { acuseEnPausa, traspaso } from "./textos.js";

describe("textos del traspaso", () => {
  it("solo promete «en un ratito» si el aviso salió, y usa el rol configurado", () => {
    expect(traspaso("la encargada", "caso").avisado).toBe(
      "Te entiendo, y quiero que esto quede bien resuelto: le paso tu caso a la encargada, " +
        "que te escribe por aquí en un ratito.",
    );
    expect(traspaso("Glei", "consulta").sinAviso).toBe(
      "Ese dato no lo tengo confirmado y prefiero no decirte algo equivocado: " +
        "le dejé tu consulta a Glei, que te va a contactar por este mismo chat.",
    );
    expect(traspaso("la encargada", "pedido").avisado).toContain(
      "Le paso tu pedido a la encargada",
    );
    expect(acuseEnPausa("la encargada")).toContain(
      "lo dejé anotado para la encargada",
    );
  });

  it("una apertura que nombra el tema reemplaza la genérica, sin cambiar la promesa", () => {
    const apertura = "A Puente Alto todavía no tengo una tarifa de despacho";
    expect(traspaso("la encargada", "consulta", apertura).avisado).toBe(
      "A Puente Alto todavía no tengo una tarifa de despacho: le paso tu consulta a la " +
        "encargada, que te escribe por aquí en un ratito.",
    );
    expect(traspaso("la encargada", "caso", apertura).sinAviso).toBe(
      "A Puente Alto todavía no tengo una tarifa de despacho: le dejé tu caso a la encargada, " +
        "que te va a contactar por este mismo chat.",
    );
  });

  it("ningún texto fijo habla como bot", () => {
    const todos = (["caso", "consulta", "revision", "pedido"] as const).flatMap(
      (t) => Object.values(traspaso("la encargada", t)),
    );
    for (const texto of [...todos, acuseEnPausa("la encargada")])
      expect(texto).not.toMatch(/deriv|asesor|sistema|\bbot\b|automátic/i);
  });
});
