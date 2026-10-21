import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { ModeloFalso } from "../adaptadores/modelo-falso.js";
import { FalloDelModelo } from "../puertos/modelo.js";
import { GastoMensual } from "./gasto-mensual.js";
import {
  LimiteDeGastoAlcanzado,
  ModeloConLimite,
} from "./modelo-con-limite.js";

const solicitud = {
  system: "s",
  user: "u",
  schema: {},
  herramienta: { nombre: "decidir_turno", descripcion: "d" },
};
const tarifa = { entrada: 1, cacheada: 1, salida: 1 };

function armar(
  responder: ConstructorParameters<typeof ModeloFalso>[0],
  limiteUSD = 1,
) {
  const gasto = new GastoMensual({
    registros: new RegistrosEnMemoria(),
    limiteUSD,
    tarifa,
    reloj: () => new Date("2026-10-16T12:00:00.000Z"),
  });
  const falso = new ModeloFalso(responder);
  return { gasto, falso, modelo: new ModeloConLimite(falso, gasto) };
}

describe("el modelo con límite de gasto", () => {
  it("cada llamada suma su costo", async () => {
    const { modelo, gasto } = armar(() => ({ ok: true }));
    expect((await modelo.completar(solicitud)).json).toEqual({ ok: true });
    expect((await gasto.delMes()).llamadas).toBe(1);
  });

  it("con el límite alcanzado no llama al modelo", async () => {
    const { modelo, falso, gasto } = armar(() => ({ ok: true }), 0.000001);
    await gasto.registrar({ tokens: { inputTokens: 10, outputTokens: 0 } });
    await expect(modelo.completar(solicitud)).rejects.toThrow(
      LimiteDeGastoAlcanzado,
    );
    expect(falso.llamadas).toHaveLength(0);
  });

  it("una llamada fallida con uso informado también cuenta", async () => {
    const metricas = { inputTokens: 1000, outputTokens: 10, latenciaMs: 5 };
    const { modelo, gasto } = armar(() => {
      throw new FalloDelModelo("json-invalido", "roto", metricas);
    });
    await expect(modelo.completar(solicitud)).rejects.toThrow(FalloDelModelo);
    expect(await gasto.delMes()).toMatchObject({
      llamadas: 1,
      inputTokens: 1000,
    });
  });
});
