import type {
  MetricasDelModelo,
  RespuestaDelModelo,
  SolicitudAlModelo,
} from "../puertos/modelo.js";

export type ConLatencia = (
  m: Omit<MetricasDelModelo, "latenciaMs">,
) => MetricasDelModelo;

/** Lo que cambia entre las APIs de OpenAI: la ruta, el cuerpo y cómo leer la respuesta. */
export interface FormatoDeApi {
  readonly ruta: string;
  cuerpo(opciones: OpcionesDelCuerpo, s: SolicitudAlModelo): object;
  interpretar(datos: unknown, conLatencia: ConLatencia): RespuestaDelModelo;
}

export interface OpcionesDelCuerpo {
  readonly modelo: string;
  readonly reasoningEffort?: string;
  readonly parametroDeTokens?: "max_tokens" | "max_completion_tokens";
}

export const MAX_TOKENS = 2048;
