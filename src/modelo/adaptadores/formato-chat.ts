import { decisionDeArgumentos } from "./decision-de-argumentos.js";
import { MAX_TOKENS, type FormatoDeApi } from "./formato.js";

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
 * `/chat/completions`: lo que entienden casi todos los proveedores compatibles con OpenAI. Con
 * OpenAI, algunos modelos solo aceptan aquí la herramienta forzada sin razonamiento.
 */
export const formatoChat: FormatoDeApi = {
  ruta: "/chat/completions",
  cuerpo: (o, s) => ({
    model: o.modelo,
    [o.parametroDeTokens ?? "max_completion_tokens"]: s.maxTokens ?? MAX_TOKENS,
    ...(o.reasoningEffort ? { reasoning_effort: o.reasoningEffort } : {}),
    messages: [
      { role: "system", content: s.system },
      { role: "user", content: s.user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: s.herramienta.nombre,
          description: s.herramienta.descripcion,
          parameters: s.schema,
          strict: true,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: s.herramienta.nombre } },
  }),
  interpretar(datos, conLatencia) {
    const r = (datos ?? {}) as RespuestaChat;
    const cacheados = r.usage?.prompt_tokens_details?.cached_tokens;
    const metricas = conLatencia({
      inputTokens: r.usage?.prompt_tokens ?? 0,
      outputTokens: r.usage?.completion_tokens ?? 0,
      ...(typeof cacheados === "number"
        ? { cachedInputTokens: cacheados }
        : {}),
    });
    const eleccion = r.choices?.[0];
    const argumentos = eleccion?.message?.tool_calls?.[0]?.function?.arguments;
    const filtrado = eleccion?.finish_reason === "content_filter";
    return decisionDeArgumentos(filtrado ? undefined : argumentos, metricas);
  },
};
