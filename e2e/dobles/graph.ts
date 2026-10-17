import type { Hono } from "hono";

/** Un mensaje que el producto mandó por la Cloud API de Meta, como lo ve el cliente. */
export interface MensajeEnviado {
  readonly id: string;
  readonly para: string;
  readonly tipo: string;
  /** El texto, o el cuerpo de un interactivo. */
  readonly texto?: string;
  readonly interactivo?: {
    readonly type: string;
    readonly action?: {
      readonly buttons?: { reply: { id: string; title: string } }[];
      readonly sections?: {
        rows: { id: string; title: string; description?: string }[];
      }[];
      readonly parameters?: { display_text: string; url: string };
    };
  };
  readonly plantilla?: string;
  /** Las variables de la plantilla en orden ({{1}}, {{2}}…). */
  readonly parametros?: readonly string[];
}

interface CuerpoDeEnvio {
  to?: string;
  status?: string;
  message_id?: string;
  typing_indicator?: { type?: string };
  type?: string;
  text?: { body?: string };
  interactive?: MensajeEnviado["interactivo"] & { body?: { text?: string } };
  template?: {
    name?: string;
    components?: { parameters?: { text?: string }[] }[];
  };
}

/** Un visto azul que el producto mandó, con «escribiendo» si lo pidió. */
export interface VistoEnviado {
  readonly mensajeId: string;
  readonly escribiendo: boolean;
}

/** El doble de Meta Graph: acepta y registra cada envío; los vistos van en su propia lista. */
export function crearGraph() {
  const enviados: MensajeEnviado[] = [];
  const leidos: VistoEnviado[] = [];
  return {
    registrar(app: Hono) {
      app.post("/graph/:version/:telefonoId/messages", async (c) => {
        const cuerpo = await c.req.json<CuerpoDeEnvio>();
        if (cuerpo.status === "read") {
          leidos.push({
            mensajeId: cuerpo.message_id ?? "",
            escribiendo: !!cuerpo.typing_indicator,
          });
          return c.json({ success: true });
        }
        const id = `wamid.e2e-${enviados.length + 1}`;
        enviados.push(enviado(id, cuerpo));
        return c.json({ messages: [{ id }] });
      });
      app.get("/__dobles/graph/leidos", (c) => c.json(leidos));
      app.get("/__dobles/graph/enviados", (c) => {
        const para = c.req.query("para");
        return c.json(
          para ? enviados.filter((m) => m.para === para) : enviados,
        );
      });
    },
  };
}

function enviado(id: string, c: CuerpoDeEnvio): MensajeEnviado {
  const texto = c.text?.body ?? c.interactive?.body?.text;
  const parametros = c.template?.components?.flatMap((x) =>
    (x.parameters ?? []).map((p) => p.text ?? ""),
  );
  return {
    id,
    para: c.to ?? "",
    tipo: c.type ?? "text",
    ...(texto ? { texto } : {}),
    ...(c.interactive ? { interactivo: c.interactive } : {}),
    ...(c.template?.name ? { plantilla: c.template.name } : {}),
    ...(parametros ? { parametros } : {}),
  };
}
