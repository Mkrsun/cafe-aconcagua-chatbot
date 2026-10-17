import { describe, expect, it } from "vitest";
import { calcularCostoUSD, tarifaDesdeTexto } from "./costo.js";
import {
  alertas,
  gastoVacio,
  mesDeChile,
  sumarConsumo,
  umbralCruzado,
} from "./gasto.js";

describe("costo y gasto del modelo", () => {
  it("tarifa los tokens cacheados aparte", () => {
    const tarifa = { entrada: 1, cacheada: 0.1, salida: 4 };
    const usd = calcularCostoUSD(
      {
        inputTokens: 1_000_000,
        cachedInputTokens: 400_000,
        outputTokens: 100_000,
      },
      tarifa,
    );
    expect(usd).toBeCloseTo(1.04, 10);
    expect(
      calcularCostoUSD({ inputTokens: 1_000_000, outputTokens: 0 }, tarifa),
    ).toBe(1);
  });

  it("lee la tarifa del entorno o explica el formato", () => {
    expect(
      tarifaDesdeTexto("1.25, 0.125 ,10", "CAFE_MODELO_TARIFA_USD_POR_MTOK"),
    ).toEqual({
      entrada: 1.25,
      cacheada: 0.125,
      salida: 10,
    });
    expect(() =>
      tarifaDesdeTexto("1,2", "CAFE_MODELO_TARIFA_USD_POR_MTOK"),
    ).toThrow(/entrada,cacheada,salida/);
  });

  it("el mes es el de Chile", () => {
    expect(mesDeChile(new Date("2026-11-01T02:00:00.000Z"))).toBe("2026-10");
    expect(mesDeChile(new Date("2026-11-01T04:00:00.000Z"))).toBe("2026-11");
  });

  it("suma llamadas con y sin uso informado", () => {
    let gasto = gastoVacio("2026-10");
    gasto = sumarConsumo(gasto, {
      tokens: { inputTokens: 100, cachedInputTokens: 40, outputTokens: 10 },
      costoUSD: 0.5,
    });
    gasto = sumarConsumo(gasto, {});
    expect(gasto).toMatchObject({
      usd: 0.5,
      llamadas: 2,
      llamadasSinUso: 1,
      inputTokens: 100,
      cachedInputTokens: 40,
      outputTokens: 10,
    });
  });

  it("avisa el umbral más alto que una suma cruza", () => {
    expect(umbralCruzado(20, 26, 50)).toBe(50);
    expect(umbralCruzado(26, 30, 50)).toBeUndefined();
    expect(umbralCruzado(20, 50, 50)).toBe(100);
    expect(alertas(41, 50)).toEqual([
      { umbral: 50, alcanzado: true },
      { umbral: 80, alcanzado: true },
      { umbral: 100, alcanzado: false },
    ]);
  });
});
