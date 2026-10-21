import type {
  ICanal,
  MensajeSaliente,
  ResultadoEnvio,
} from "../puertos/canal.js";
import { cuerpoDelMensaje } from "./cuerpo-del-mensaje.js";

interface RespuestaDeGraph {
  error?: { message?: string; code?: unknown };
  messages?: { id?: string }[];
}

/** WhatsApp Cloud API (Graph): texto, contenido interactivo o plantilla, y el visto. */
export class CanalWhatsApp implements ICanal {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly base: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async enviar(mensaje: MensajeSaliente): Promise<ResultadoEnvio> {
    const { respuesta, datos } = await this.post({
      to: mensaje.telefono,
      ...cuerpoDelMensaje(mensaje),
    });
    if (!respuesta.ok)
      return {
        enviado: false,
        error: datos?.error?.message ?? `HTTP ${respuesta.status}`,
        ...(typeof datos?.error?.code === "number"
          ? { codigoError: datos.error.code }
          : {}),
      };
    const id = datos?.messages?.[0]?.id;
    return { enviado: true, ...(id ? { idDelProveedor: id } : {}) };
  }

  async marcarLeido(
    mensajeId: string,
    opciones: { escribiendo?: boolean } = {},
  ) {
    const { respuesta } = await this.post({
      status: "read",
      message_id: mensajeId,
      ...(opciones.escribiendo ? { typing_indicator: { type: "text" } } : {}),
    });
    if (!respuesta.ok)
      throw new Error(`marcar leído falló: HTTP ${respuesta.status}`);
  }

  private async post(cuerpo: Record<string, unknown>) {
    const respuesta = await this.fetchFn(
      `${this.base}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
      },
    );
    const datos = (await respuesta
      .json()
      .catch(() => null)) as RespuestaDeGraph | null;
    return { respuesta, datos };
  }
}
