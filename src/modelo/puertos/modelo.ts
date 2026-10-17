/** Lo que el turno le pide al modelo: el JSON de una herramienta forzada. */
export interface SolicitudAlModelo {
  /** Prefijo estable (cacheable por el proveedor): nada variable del turno. */
  readonly system: string;
  readonly user: string;
  /** JSON Schema de la decisión (modo estricto). */
  readonly schema: object;
  readonly herramienta: {
    readonly nombre: string;
    readonly descripcion: string;
  };
  readonly maxTokens?: number;
}

/** Consumo de una llamada: la base del costo. `cachedInputTokens` es parte de `inputTokens`. */
export interface MetricasDelModelo {
  readonly inputTokens: number;
  readonly cachedInputTokens?: number;
  readonly outputTokens: number;
  readonly latenciaMs: number;
}

export interface RespuestaDelModelo {
  readonly json: unknown;
  readonly metricas?: MetricasDelModelo;
}

export type MotivoDeFallo =
  "tiempo-agotado" | "json-invalido" | "http" | "rechazo";

/** Un fallo tipado del proveedor: nunca un `AbortError` ni un `SyntaxError` crudo. */
export class FalloDelModelo extends Error {
  constructor(
    readonly motivo: MotivoDeFallo,
    mensaje: string,
    /** Uso que el proveedor alcanzó a informar: cuenta en el gasto. */
    readonly metricas?: MetricasDelModelo,
  ) {
    super(mensaje);
    this.name = "FalloDelModelo";
  }
}

/** El límite mensual se alcanzó: no hay más inferencias este mes (el turno traspasa). */
export class LimiteDeGastoAlcanzado extends Error {
  constructor() {
    super("Límite de gasto mensual del modelo alcanzado");
    this.name = "LimiteDeGastoAlcanzado";
  }
}

/**
 * El modelo (borde: un proveedor compatible con OpenAI). Real: `ModeloOpenAI` · fake:
 * `ModeloFalso` (guionado).
 */
export interface IModelo {
  /** @throws FalloDelModelo */
  completar(solicitud: SolicitudAlModelo): Promise<RespuestaDelModelo>;
}
