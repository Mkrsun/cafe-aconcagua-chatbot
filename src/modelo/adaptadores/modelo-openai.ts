import {
  FalloDelModelo,
  type IModelo,
  type MetricasDelModelo,
  type RespuestaDelModelo,
  type SolicitudAlModelo,
} from "../puertos/modelo.js";
import { interpretarRespuesta } from "./interpretar-respuesta.js";

/** El `fetch` que usa el adaptador: inyectable para probar sin red. */
export type FetchDelModelo = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

export interface ConfiguracionDelModelo {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly modelo: string;
  readonly timeoutMs: number;
  readonly reasoningEffort?: string;
  /** OpenAI (gpt-5+) pide `max_completion_tokens`; otros proveedores, `max_tokens`. */
  readonly parametroDeTokens?: "max_tokens" | "max_completion_tokens";
  readonly fetch?: FetchDelModelo;
}

/**
 * Cualquier API compatible con OpenAI (`/chat/completions`): función forzada y estricta, con
 * timeout. El proveedor es configuración: cambiarlo es cambiar base, clave y modelo.
 */
export class ModeloOpenAI implements IModelo {
  constructor(private readonly config: ConfiguracionDelModelo) {}

  async completar(solicitud: SolicitudAlModelo): Promise<RespuestaDelModelo> {
    const inicio = Date.now();
    const signal = AbortSignal.timeout(this.config.timeoutMs);
    const datos = await this.llamar(this.cuerpo(solicitud), signal);
    const conLatencia = (m: Omit<MetricasDelModelo, "latenciaMs">) => ({
      ...m,
      latenciaMs: Date.now() - inicio,
    });
    return interpretarRespuesta(datos, conLatencia);
  }

  private cuerpo(s: SolicitudAlModelo): string {
    const { nombre, descripcion } = s.herramienta;
    return JSON.stringify({
      model: this.config.modelo,
      [this.config.parametroDeTokens ?? "max_completion_tokens"]:
        s.maxTokens ?? 2048,
      ...(this.config.reasoningEffort
        ? { reasoning_effort: this.config.reasoningEffort }
        : {}),
      messages: [
        { role: "system", content: s.system },
        { role: "user", content: s.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: nombre,
            description: descripcion,
            parameters: s.schema,
            strict: true,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: nombre } },
    });
  }

  /** POST y lectura del cuerpo bajo el mismo `signal`: el timeout cubre ambos. */
  private async llamar(body: string, signal: AbortSignal): Promise<unknown> {
    const fetch = this.config.fetch ?? (globalThis.fetch as FetchDelModelo);
    try {
      const pedido = fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body,
        signal,
      });
      const respuesta = await Promise.race([pedido, abortado(signal)]);
      if (!respuesta.ok)
        throw new FalloDelModelo(
          "http",
          `el modelo respondió HTTP ${respuesta.status}`,
        );
      return await Promise.race([respuesta.json(), abortado(signal)]);
    } catch (error) {
      if (error instanceof FalloDelModelo) throw error;
      if (signal.aborted)
        throw new FalloDelModelo(
          "tiempo-agotado",
          `el modelo no respondió en ${this.config.timeoutMs} ms`,
        );
      throw new FalloDelModelo(
        "http",
        `no se pudo llamar al modelo: ${String(error)}`,
      );
    }
  }
}

/** Rechaza cuando el `signal` vence: corta aunque el `fetch` no lo respete. */
const abortado = (signal: AbortSignal) =>
  new Promise<never>((_, rechazar) =>
    signal.addEventListener("abort", () => rechazar(signal.reason), {
      once: true,
    }),
  );
