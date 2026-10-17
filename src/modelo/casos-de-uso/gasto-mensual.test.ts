import { describe, expect, it } from "vitest";
import { claveDeRegistro } from "../../plataforma/registros/puerto.js";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RelojFalso } from "../../plataforma/reloj-falso.js";
import { GastoMensual } from "./gasto-mensual.js";

const tarifa = { entrada: 1, cacheada: 0.1, salida: 4 };
const millonDeEntrada = { tokens: { inputTokens: 1_000_000, outputTokens: 0 } };

function mundo(limiteUSD = 2) {
  const reloj = new RelojFalso(new Date("2026-10-16T12:00:00.000Z"));
  const avisos: number[] = [];
  const registros = new RegistrosEnMemoria();
  const gasto = new GastoMensual({
    registros,
    limiteUSD,
    tarifa,
    reloj: reloj.ahora,
    avisar: async (umbral) => void avisos.push(umbral),
  });
  return { gasto, reloj, avisos, registros };
}

describe("el gasto mensual del modelo", () => {
  it("suma el costo, avisa cada umbral una vez y corta al llegar al límite", async () => {
    const { gasto, avisos } = mundo(2);
    await gasto.registrar(millonDeEntrada);
    expect(avisos).toEqual([50]);
    expect(await gasto.superado()).toBe(false);
    await gasto.registrar({
      tokens: { inputTokens: 600_000, outputTokens: 0 },
    });
    expect(avisos).toEqual([50, 80]);
    await gasto.registrar({
      tokens: { inputTokens: 400_000, outputTokens: 0 },
    });
    expect(avisos).toEqual([50, 80, 100]);
    expect(await gasto.superado()).toBe(true);
    expect(await gasto.delMes()).toMatchObject({
      mes: "2026-10",
      usd: 2,
      superado: true,
    });
  });

  it("el mes nuevo empieza en cero sin ningún job", async () => {
    const { gasto, reloj } = mundo(1);
    await gasto.registrar(millonDeEntrada);
    expect(await gasto.superado()).toBe(true);
    reloj.fijar(new Date("2026-11-01T12:00:00.000Z"));
    expect(await gasto.superado()).toBe(false);
    expect((await gasto.delMes()).usd).toBe(0);
  });

  it("sin tarifa cuenta tokens pero no dólares", async () => {
    const registros = new RegistrosEnMemoria();
    const gasto = new GastoMensual({
      registros,
      limiteUSD: 1,
      reloj: () => new Date("2026-10-16T12:00:00.000Z"),
    });
    await gasto.registrar(millonDeEntrada);
    expect(await gasto.delMes()).toMatchObject({
      usd: 0,
      llamadasSinTarifa: 1,
      conTarifa: false,
    });
  });

  it("suma sobre el acumulado ya guardado del mes", async () => {
    const { gasto, registros } = mundo(10);
    await registros.guardar(claveDeRegistro("llm-gasto-mensual", "2026-10"), {
      mes: "2026-10",
      usd: 3,
      llamadas: 30,
      llamadasSinUso: 0,
      llamadasSinTarifa: 0,
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
    });
    await gasto.registrar(millonDeEntrada);
    expect(await gasto.delMes()).toMatchObject({ usd: 4, llamadas: 31 });
  });
});
