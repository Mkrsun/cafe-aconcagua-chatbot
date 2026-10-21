import type { Hono } from "hono";
import type { DecisionDelTurno } from "../../src/turno/dominio/decision.js";

/** Lo que el turno le contó al modelo: a quién atendía y el mensaje (ya agrupado). */
export interface LlamadaAlModelo {
  readonly cliente: string;
  readonly mensaje: string;
}

/** Si la prueba no guionó el turno: un saludo que no promete nada. */
const POR_DEFECTO: DecisionDelTurno = {
  intent: "informacion",
  action: "RESPONDER",
  changes: [],
  knownRefs: [],
  faltantes: [],
  despacho: "",
  forma: { tipo: "texto", opciones: [], skus: [] },
  response: "¡Hola! ¿En qué te puedo ayudar hoy?",
  recordar: [],
};

interface CuerpoDelModelo {
  messages?: { role: string; content: string }[];
  input?: { role: string; content: string }[];
}

/**
 * El modelo guionado, compatible con OpenAI (`/responses` y `/chat/completions`): entrega por
 * `decidir_turno` la siguiente decisión del guion del cliente, que se reconoce por su nombre en el
 * contexto del turno.
 */
export function crearModelo() {
  const guiones = new Map<string, DecisionDelTurno[]>();
  const llamadas: LlamadaAlModelo[] = [];
  const decidir = (cuerpo: CuerpoDelModelo) => {
    const mensajes = cuerpo.input ?? cuerpo.messages ?? [];
    const usuario = mensajes.find((m) => m.role === "user")?.content ?? "{}";
    const contexto = JSON.parse(usuario) as {
      cliente?: { nombre?: string };
      mensaje?: string;
    };
    const cliente = contexto.cliente?.nombre ?? "desconocido";
    llamadas.push({ cliente, mensaje: contexto.mensaje ?? "" });
    return JSON.stringify(guiones.get(cliente)?.shift() ?? POR_DEFECTO);
  };
  return {
    registrar(app: Hono) {
      app.post("/llm/v1/responses", async (c) =>
        c.json(respuestaResponses(decidir(await c.req.json()))),
      );
      app.post("/llm/v1/chat/completions", async (c) =>
        c.json(respuestaChat(decidir(await c.req.json()))),
      );
      app.post("/__dobles/modelo/guion", async (c) => {
        const { cliente, decisiones } = await c.req.json<{
          cliente: string;
          decisiones: DecisionDelTurno[];
        }>();
        guiones.set(cliente, [...decisiones]);
        return c.json({ ok: true });
      });
      app.get("/__dobles/modelo/llamadas", (c) => c.json(llamadas));
    },
  };
}

const respuestaResponses = (argumentos: string) => ({
  status: "completed",
  output: [
    { type: "function_call", name: "decidir_turno", arguments: argumentos },
  ],
  usage: { input_tokens: 1000, output_tokens: 50 },
});

const respuestaChat = (argumentos: string) => ({
  choices: [
    {
      finish_reason: "stop",
      message: {
        tool_calls: [
          {
            type: "function",
            function: { name: "decidir_turno", arguments: argumentos },
          },
        ],
      },
    },
  ],
  usage: { prompt_tokens: 1000, completion_tokens: 50 },
});
