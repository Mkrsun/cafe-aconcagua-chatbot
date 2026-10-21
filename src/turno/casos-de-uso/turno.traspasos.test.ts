import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { GastoMensual } from "../../modelo/casos-de-uso/gasto-mensual.js";
import { ModeloConLimite } from "../../modelo/casos-de-uso/modelo-con-limite.js";
import { decision, mundoDelTurno } from "../test-support/mundo-del-turno.js";

describe("el turno: reclamos, enojo, límites y cierres", () => {
  it("pedir una persona pasa a la encargada sin gastar inferencia", async () => {
    const m = await mundoDelTurno([]);
    const r = await m.atender("quiero hablar con una persona");
    expect(r).toMatchObject({
      inferencias: 0,
      traspaso: {
        tipo: "caso",
        motivo: "El cliente pidió hablar con una persona",
      },
    });
    expect(r.traspaso?.resumen).toContain("quiero hablar con una persona");
    expect(r.traspaso?.apertura).toBe("Claro, con gusto");
  });

  it("pedir un café sin precio cargado traspasa nombrando el café", async () => {
    const m = await mundoDelTurno(
      [
        decision({
          action: "PROPONER",
          changes: [{ sku: "0040", cantidad: 2 }],
        }),
      ],
      { tramo: "mayorista" },
    );
    const r = await m.atender("quiero 2 cerro alegre");
    expect(r.traspaso).toMatchObject({
      tipo: "consulta",
      apertura: "El precio de Cerro Alegre todavía no lo tengo confirmado",
    });
  });

  it("un reclamo tranquilo lo atiende el chatbot y queda registrado para el equipo", async () => {
    const m = await mundoDelTurno([
      decision({
        intent: "reclamo",
        response: "¡Qué pena! ¿Me mandas una foto de cómo llegó?",
      }),
    ]);
    const r = await m.atender("me llegó el café vencido");
    expect(r.texto).toBe("¡Qué pena! ¿Me mandas una foto de cómo llegó?");
    expect(r.traspaso).toBeUndefined();
    expect(r.reclamo).toMatchObject({
      motivo: "Reclamo registrado por el chatbot",
    });
    expect(r.reclamo?.resumen).toContain("me llegó el café vencido");
  });

  it("DERIVAR por un dato que no está en la FAQ es una consulta", async () => {
    const m = await mundoDelTurno([
      decision({
        intent: "informacion",
        action: "DERIVAR",
        faltantes: ["horario de retiro"],
      }),
    ]);
    expect(
      (await m.atender("¿a qué hora puedo retirar?")).traspaso,
    ).toMatchObject({
      tipo: "consulta",
      motivo: "El chatbot no tiene el dato: horario de retiro",
    });
  });

  it("una comuna sin tarifa es un traspaso de despacho que la nombra", async () => {
    const m = await mundoDelTurno([
      decision({ action: "DERIVAR", despacho: "Puente Alto" }),
    ]);
    const r = await m.atender("¿despachan a Puente Alto?");
    expect(r.traspaso).toMatchObject({
      tipo: "consulta",
      motivo: "Despacho a «Puente Alto» sin tarifa definida",
      apertura: "A Puente Alto todavía no tengo una tarifa de despacho",
    });
  });

  it("DERIVAR usa la frase del modelo como apertura, salvo si promete", async () => {
    const m = await mundoDelTurno([
      decision({
        intent: "informacion",
        action: "DERIVAR",
        faltantes: ["factura"],
        response:
          "Sobre la factura para tu cafetería, quiero darte el dato exacto.",
      }),
      decision({
        intent: "informacion",
        action: "DERIVAR",
        response: "La encargada te escribe en un ratito con el dato",
      }),
    ]);
    expect((await m.atender("¿emiten factura?")).traspaso?.apertura).toBe(
      "Sobre la factura para tu cafetería, quiero darte el dato exacto",
    );
    expect((await m.atender("¿y boleta?")).traspaso?.apertura).toBeUndefined();
  });

  it("un «gracias» suelto se responde con una reacción 👍, sin inferir", async () => {
    const m = await mundoDelTurno([]);
    const r = await m.atender("muchas gracias 🙏", "wamid.9");
    expect(r).toMatchObject({
      inferencias: 0,
      contenido: { tipo: "reaccion", mensajeId: "wamid.9", emoji: "👍" },
    });
    expect(r.texto).toBe("¡A ti! Aquí estoy cuando me necesites.");
  });

  it("con el límite de gasto alcanzado no llama al modelo y pasa a la encargada", async () => {
    const gasto = new GastoMensual({
      registros: new RegistrosEnMemoria(),
      limiteUSD: 0.000001,
      tarifa: { entrada: 1, cacheada: 1, salida: 1 },
      reloj: () => new Date("2026-10-16T15:00:00.000Z"),
    });
    await gasto.registrar({ tokens: { inputTokens: 100, outputTokens: 0 } });
    const m = await mundoDelTurno([decision({ response: "no debería" })], {
      modelo: (falso) => new ModeloConLimite(falso, gasto),
    });
    const r = await m.atender("hola, necesito café");
    expect(r.traspaso).toMatchObject({
      tipo: "revision",
      motivo: "Límite de gasto mensual del modelo alcanzado",
    });
    expect(m.falso.llamadas).toHaveLength(0);
  });

  it("si el modelo falla (timeout, JSON roto), el cliente nunca lee un error", async () => {
    const m = await mundoDelTurno([]);
    const r = await m.atender("hola");
    expect(r.traspaso).toMatchObject({ tipo: "revision" });
  });
});
