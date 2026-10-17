import { describe, expect, it } from "vitest";
import { clasificarMensaje } from "./clasificar.js";
import { TIEMPOS_POR_DEFECTO } from "./tiempos.js";
import { vencimientoDelLote } from "./vencimiento.js";

describe("cómo termina el mensaje del cliente", () => {
  it.each([
    "hola buenas",
    "Hola",
    "wena po",
    "necesito café para,",
    "te cuento:",
    "y también...",
    "quiero 5 bolsas de",
    "molido y",
    "5 cerro",
  ])("«%s» queda incompleto (espera larga)", (texto) => {
    expect(clasificarMensaje(texto)).toBe("incompleto");
  });

  it.each([
    "¿Cuándo llega el despacho?",
    "eso sería todo, gracias",
    "sí",
    "ok",
    "dale",
    "2",
    "Muchas gracias 🙏",
  ])("«%s» es un cierre (espera corta)", (texto) => {
    expect(clasificarMensaje(texto)).toBe("cierre");
  });

  it.each([
    "Necesito 7 bolsas de café molido futaleufú",
    "hola, gracias por lo de ayer, ahora necesito 5 bolsas",
    undefined,
  ])("«%s» es normal", (texto) => {
    expect(clasificarMensaje(texto)).toBe("normal");
  });
});

describe("cuándo vence un lote", () => {
  const t0 = new Date("2026-10-16T12:00:00.000Z");
  const mas = (s: number) => new Date(t0.getTime() + s * 1000);

  it("según la clase del último mensaje", () => {
    const base = { abiertoEn: t0, ultimoMensajeEn: mas(10) };
    expect(
      vencimientoDelLote(
        { ...base, ultimaClase: "incompleto" },
        TIEMPOS_POR_DEFECTO,
      ),
    ).toEqual(mas(55));
    expect(
      vencimientoDelLote(
        { ...base, ultimaClase: "normal" },
        TIEMPOS_POR_DEFECTO,
      ),
    ).toEqual(mas(35));
    expect(
      vencimientoDelLote(
        { ...base, ultimaClase: "cierre" },
        TIEMPOS_POR_DEFECTO,
      ),
    ).toEqual(mas(18));
  });

  it("nunca pasa del techo desde el primer mensaje", () => {
    const lote = {
      abiertoEn: t0,
      ultimoMensajeEn: mas(170),
      ultimaClase: "incompleto" as const,
    };
    expect(vencimientoDelLote(lote, TIEMPOS_POR_DEFECTO)).toEqual(mas(180));
  });
});
