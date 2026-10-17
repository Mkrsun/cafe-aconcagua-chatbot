import {
  FalloDelModelo,
  type MetricasDelModelo,
  type RespuestaDelModelo,
} from "../puertos/modelo.js";

interface RespuestaChat {
  choices?: {
    finish_reason?: string;
    message?: { tool_calls?: { function?: { arguments?: unknown } }[] };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

/**
 * La respuesta de `/chat/completions` como decisión y métricas. Un rechazo o una respuesta sin la
 * herramienta es `rechazo`; argumentos que no son JSON, `json-invalido` (con su uso: se cobró).
 */
export function interpretarRespuesta(
  datos: unknown,
  conLatencia: (m: Omit<MetricasDelModelo, "latenciaMs">) => MetricasDelModelo,
): RespuestaDelModelo {
  const r = (datos ?? {}) as RespuestaChat;
  const cacheados = r.usage?.prompt_tokens_details?.cached_tokens;
  const metricas = conLatencia({
    inputTokens: r.usage?.prompt_tokens ?? 0,
    outputTokens: r.usage?.completion_tokens ?? 0,
    ...(typeof cacheados === "number" ? { cachedInputTokens: cacheados } : {}),
  });
  const eleccion = r.choices?.[0];
  const argumentos = eleccion?.message?.tool_calls?.[0]?.function?.arguments;
  if (
    eleccion?.finish_reason === "content_filter" ||
    typeof argumentos !== "string"
  )
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
