import { decisionDeArgumentos } from "./decision-de-argumentos.js";
import { MAX_TOKENS, type FormatoDeApi } from "./formato.js";

interface RespuestaResponses {
  output?: { type?: string; arguments?: unknown }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
}

/**
 * `/responses`: la API de OpenAI que admite la herramienta forzada CON razonamiento. Los tokens
 * de razonamiento vienen dentro de `output_tokens`, así que el gasto los cuenta. `store: false`:
 * OpenAI no guarda las conversaciones de los clientes.
 */
export const formatoResponses: FormatoDeApi = {
  ruta: "/responses",
  cuerpo: (o, s) => ({
    model: o.modelo,
    max_output_tokens: s.maxTokens ?? MAX_TOKENS,
    ...(o.reasoningEffort ? { reasoning: { effort: o.reasoningEffort } } : {}),
    store: false,
    instructions: s.system,
    input: [{ role: "user", content: s.user }],
    tools: [
      {
        type: "function",
        name: s.herramienta.nombre,
        description: s.herramienta.descripcion,
        parameters: s.schema,
        strict: true,
      },
    ],
    tool_choice: { type: "function", name: s.herramienta.nombre },
  }),
  interpretar(datos, conLatencia) {
    const r = (datos ?? {}) as RespuestaResponses;
    const cacheados = r.usage?.input_tokens_details?.cached_tokens;
    const metricas = conLatencia({
      inputTokens: r.usage?.input_tokens ?? 0,
      outputTokens: r.usage?.output_tokens ?? 0,
      ...(typeof cacheados === "number"
        ? { cachedInputTokens: cacheados }
        : {}),
    });
    const llamada = r.output?.find((o) => o.type === "function_call");
    return decisionDeArgumentos(llamada?.arguments, metricas);
  },
};
