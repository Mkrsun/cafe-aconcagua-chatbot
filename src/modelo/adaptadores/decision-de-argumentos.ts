import {
  FalloDelModelo,
  type MetricasDelModelo,
  type RespuestaDelModelo,
} from "../puertos/modelo.js";

/**
 * Los argumentos de la herramienta como decisión. Sin argumentos es `rechazo`; argumentos que no
 * son JSON, `json-invalido`. Ambos llevan su uso: se cobró.
 */
export function decisionDeArgumentos(
  argumentos: unknown,
  metricas: MetricasDelModelo,
): RespuestaDelModelo {
  if (typeof argumentos !== "string")
    throw new FalloDelModelo(
      "rechazo",
      "el modelo no entregó la decisión",
      metricas,
    );
  try {
    return { json: JSON.parse(argumentos), metricas };
  } catch {
    throw new FalloDelModelo(
      "json-invalido",
      "el modelo entregó argumentos inválidos",
      metricas,
    );
  }
}
