import {
  FalloDelModelo,
  LimiteDeGastoAlcanzado,
  type IModelo,
  type MetricasDelModelo,
  type RespuestaDelModelo,
  type SolicitudAlModelo,
} from "../puertos/modelo.js";
import type { GastoMensual } from "./gasto-mensual.js";

export { LimiteDeGastoAlcanzado };

/**
 * El modelo detrás del cortacircuitos: no llama si el mes ya alcanzó el límite y suma cada llamada
 * (también las fallidas con uso informado). Registrar el gasto nunca tumba un turno.
 */
export class ModeloConLimite implements IModelo {
  constructor(
    private readonly modelo: IModelo,
    private readonly gasto: GastoMensual,
  ) {}

  async completar(solicitud: SolicitudAlModelo): Promise<RespuestaDelModelo> {
    if (await this.gasto.superado().catch(() => false))
      throw new LimiteDeGastoAlcanzado();
    try {
      const respuesta = await this.modelo.completar(solicitud);
      await this.anotar(respuesta.metricas);
      return respuesta;
    } catch (error) {
      await this.anotar(
        error instanceof FalloDelModelo ? error.metricas : undefined,
      );
      throw error;
    }
  }

  private async anotar(metricas: MetricasDelModelo | undefined) {
    const tokens = metricas && {
      inputTokens: metricas.inputTokens,
      outputTokens: metricas.outputTokens,
      ...(metricas.cachedInputTokens === undefined
        ? {}
        : { cachedInputTokens: metricas.cachedInputTokens }),
    };
    await this.gasto
      .registrar(tokens ? { tokens } : {})
      .catch((error: unknown) =>
        console.warn("no se pudo sumar el gasto del modelo", error),
      );
  }
}
