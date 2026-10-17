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
};

/**
 * El modelo guionado, compatible con OpenAI (`/chat/completions`): entrega por `decidir_turno` la
 * siguiente decisión del guion del cliente, que se reconoce por su nombre en el contexto del turno.
 */
export function crearModelo() {
  const guiones = new Map<string, DecisionDelTurno[]>();
  const llamadas: LlamadaAlModelo[] = [];
  return {
    registrar(app: Hono) {
      app.post("/llm/v1/chat/completions", async (c) => {
        const cuerpo = await c.req.json<{
          messages?: { role: string; content: string }[];
        }>();
        const usuario =
          cuerpo.messages?.find((m) => m.role === "user")?.content ?? "{}";
        const contexto = JSON.parse(usuario) as {
          cliente?: { nombre?: string };
          mensaje?: string;
        };
        const cliente = contexto.cliente?.nombre ?? "desconocido";
        llamadas.push({ cliente, mensaje: contexto.mensaje ?? "" });
        const decision = guiones.get(cliente)?.shift() ?? POR_DEFECTO;
        return c.json(respuesta(decision));
      });
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

const respuesta = (decision: DecisionDelTurno) => ({
  choices: [
    {
      finish_reason: "stop",
      message: {
        tool_calls: [
          {
            type: "function",
            function: {
              name: "decidir_turno",
              arguments: JSON.stringify(decision),
            },
          },
        ],
      },
    },
  ],
  usage: { prompt_tokens: 1000, completion_tokens: 50 },
});
