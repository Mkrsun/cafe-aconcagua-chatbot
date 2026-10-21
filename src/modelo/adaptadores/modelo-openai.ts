import {
  FalloDelModelo,
  type IModelo,
  type MetricasDelModelo,
  type RespuestaDelModelo,
  type SolicitudAlModelo,
} from "../puertos/modelo.js";
import type { FormatoDeApi } from "./formato.js";
import { formatoChat } from "./formato-chat.js";
import { formatoResponses } from "./formato-responses.js";

export type ApiDelModelo = "responses" | "chat";

const FORMATOS: Record<ApiDelModelo, FormatoDeApi> = {
  responses: formatoResponses,
  chat: formatoChat,
};

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
  /** `responses` (OpenAI, admite razonamiento con la herramienta) o `chat` (otros proveedores). */
  readonly api?: ApiDelModelo;
  readonly fetch?: FetchDelModelo;
}

/**
 * Una API compatible con OpenAI (`/responses` o `/chat/completions`): función forzada y estricta,
 * con timeout. El proveedor es configuración: cambiarlo es cambiar base, clave, modelo y API.
 */
export class ModeloOpenAI implements IModelo {
  constructor(private readonly config: ConfiguracionDelModelo) {}

  async completar(solicitud: SolicitudAlModelo): Promise<RespuestaDelModelo> {
    const formato = FORMATOS[this.config.api ?? "responses"];
    const inicio = Date.now();
    const signal = AbortSignal.timeout(this.config.timeoutMs);
    const cuerpo = JSON.stringify(formato.cuerpo(this.config, solicitud));
    const datos = await this.llamar(formato.ruta, cuerpo, signal);
    const conLatencia = (m: Omit<MetricasDelModelo, "latenciaMs">) => ({
      ...m,
      latenciaMs: Date.now() - inicio,
    });
    return formato.interpretar(datos, conLatencia);
  }

  /** POST y lectura del cuerpo bajo el mismo `signal`: el timeout cubre ambos. */
  private async llamar(
    ruta: string,
    body: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    const fetch = this.config.fetch ?? (globalThis.fetch as FetchDelModelo);
    try {
      const pedido = fetch(`${this.config.baseUrl}${ruta}`, {
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
