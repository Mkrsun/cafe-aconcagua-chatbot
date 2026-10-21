import { describe, expect, it } from "vitest";
import { FalloDelModelo } from "../puertos/modelo.js";
import {
  ModeloOpenAI,
  type ConfiguracionDelModelo,
  type FetchDelModelo,
} from "./modelo-openai.js";

const solicitud = {
  system: "reglas",
  user: '{"mensaje":"hola"}',
  schema: { type: "object" },
  herramienta: { nombre: "decidir_turno", descripcion: "Entrega la decisión" },
};

const respuestaChat = (argumentos: string, usage: object = {}) => ({
  choices: [
    { message: { tool_calls: [{ function: { arguments: argumentos } }] } },
  ],
  usage: { prompt_tokens: 120, completion_tokens: 30, ...usage },
});

const respuestaResponses = (argumentos: string, usage: object = {}) => ({
  status: "completed",
  output: [
    { type: "reasoning", summary: [] },
    { type: "function_call", name: "decidir_turno", arguments: argumentos },
  ],
  usage: { input_tokens: 120, output_tokens: 30, ...usage },
});

function conFetch(
  responder: () => Promise<Response>,
  extra: Partial<ConfiguracionDelModelo> = {},
) {
  const pedidos: { url: string; cuerpo: Record<string, unknown> }[] = [];
  const fetch: FetchDelModelo = async (url, init) => {
    pedidos.push({ url, cuerpo: JSON.parse(init.body) });
    return responder();
  };
  const modelo = new ModeloOpenAI({
    baseUrl: "https://llm.prueba/v1",
    apiKey: "clave",
    modelo: "gpt-6-luna",
    timeoutMs: 50,
    fetch,
    ...extra,
  });
  return { modelo, pedidos };
}

const chat = { api: "chat" } as const;

describe("adaptador por /chat/completions", () => {
  it("fuerza la herramienta por nombre, estricta, y lee los tokens cacheados", async () => {
    const { modelo, pedidos } = conFetch(
      async () =>
        Response.json(
          respuestaChat('{"action":"RESPONDER"}', {
            prompt_tokens_details: { cached_tokens: 100 },
          }),
        ),
      chat,
    );
    const r = await modelo.completar(solicitud);
    expect(r.json).toEqual({ action: "RESPONDER" });
    expect(r.metricas).toMatchObject({
      inputTokens: 120,
      cachedInputTokens: 100,
      outputTokens: 30,
    });
    const [{ url, cuerpo }] = pedidos as [
      { url: string; cuerpo: Record<string, any> },
    ];
    expect(url).toBe("https://llm.prueba/v1/chat/completions");
    expect(cuerpo.model).toBe("gpt-6-luna");
    expect(cuerpo.tools[0].function).toMatchObject({
      name: "decidir_turno",
      strict: true,
    });
    expect(cuerpo.tool_choice).toEqual({
      type: "function",
      function: { name: "decidir_turno" },
    });
    expect(cuerpo.messages[0]).toEqual({ role: "system", content: "reglas" });
  });

  it("JSON roto es json-invalido con su uso; HTTP 500 es http", async () => {
    const roto = conFetch(
      async () => Response.json(respuestaChat("{no json")),
      chat,
    );
    const error = await roto.modelo.completar(solicitud).catch((e) => e);
    expect(error).toBeInstanceOf(FalloDelModelo);
    expect(error).toMatchObject({
      motivo: "json-invalido",
      metricas: { inputTokens: 120 },
    });
    const caido = conFetch(
      async () => new Response("x", { status: 500 }),
      chat,
    );
    await expect(caido.modelo.completar(solicitud)).rejects.toMatchObject({
      motivo: "http",
    });
  });

  it("una inferencia colgada se corta a tiempo", async () => {
    const colgado = conFetch(() => new Promise<Response>(() => undefined));
    await expect(colgado.modelo.completar(solicitud)).rejects.toMatchObject({
      motivo: "tiempo-agotado",
    });
  });
});

describe("adaptador por /responses (por defecto)", () => {
  it("fuerza la herramienta con razonamiento y lee tokens cacheados y de salida", async () => {
    const { modelo, pedidos } = conFetch(
      async () =>
        Response.json(
          respuestaResponses('{"action":"RESPONDER"}', {
            input_tokens_details: { cached_tokens: 100 },
          }),
        ),
      { reasoningEffort: "low" },
    );
    const r = await modelo.completar(solicitud);
    expect(r.json).toEqual({ action: "RESPONDER" });
    expect(r.metricas).toMatchObject({
      inputTokens: 120,
      cachedInputTokens: 100,
      outputTokens: 30,
    });
    const [{ url, cuerpo }] = pedidos as [
      { url: string; cuerpo: Record<string, any> },
    ];
    expect(url).toBe("https://llm.prueba/v1/responses");
    expect(cuerpo).toMatchObject({
      model: "gpt-6-luna",
      instructions: "reglas",
      reasoning: { effort: "low" },
      max_output_tokens: 2048,
      store: false,
    });
    expect(cuerpo.input).toEqual([
      { role: "user", content: '{"mensaje":"hola"}' },
    ]);
    expect(cuerpo.tools[0]).toMatchObject({
      type: "function",
      name: "decidir_turno",
      strict: true,
    });
    expect(cuerpo.tool_choice).toEqual({
      type: "function",
      name: "decidir_turno",
    });
  });

  it("sin la herramienta es rechazo con su uso; JSON roto es json-invalido", async () => {
    const sinHerramienta = conFetch(async () =>
      Response.json({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [{ type: "reasoning", summary: [] }],
        usage: { input_tokens: 120, output_tokens: 2048 },
      }),
    );
    await expect(
      sinHerramienta.modelo.completar(solicitud),
    ).rejects.toMatchObject({
      motivo: "rechazo",
      metricas: { outputTokens: 2048 },
    });
    const roto = conFetch(async () =>
      Response.json(respuestaResponses("{no json")),
    );
    await expect(roto.modelo.completar(solicitud)).rejects.toMatchObject({
      motivo: "json-invalido",
      metricas: { inputTokens: 120 },
    });
  });
});
