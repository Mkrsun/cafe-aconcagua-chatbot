import type {
  ConsultaDePago,
  IProveedorDePago,
  SolicitudDeCobro,
} from "../puertos/cobro.js";

export interface ConfiguracionDeKhipu {
  readonly apiKey: string;
  readonly base: string;
  /** La URL pública del webhook que Khipu llama al confirmar un pago. */
  readonly notifyUrl?: string;
  readonly fetch?: typeof fetch;
}

const ESTADOS: Readonly<Record<string, ConsultaDePago["estado"]>> = {
  done: "pagado",
  rejected: "rechazado",
  expired: "vencido",
};

/** Khipu (API v3): crear el cobro y consultar su estado; la confirmación siempre se consulta. */
export class Khipu implements IProveedorDePago {
  constructor(private readonly config: ConfiguracionDeKhipu) {}

  async crearCobro(s: SolicitudDeCobro) {
    const r = await this.pedir("/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: s.montoClp,
        currency: "CLP",
        subject: s.asunto,
        transaction_id: s.referencia,
        ...(this.config.notifyUrl ? { notify_url: this.config.notifyUrl } : {}),
      }),
    });
    if (!r.ok) throw new Error(`khipu: HTTP ${r.status} al crear el cobro`);
    const datos = (await r.json()) as {
      payment_id?: string;
      payment_url?: string;
    };
    if (!datos.payment_id || !datos.payment_url)
      throw new Error("khipu: respuesta sin payment_id ni payment_url");
    return { id: datos.payment_id, url: datos.payment_url };
  }

  async consultar(id: string): Promise<ConsultaDePago> {
    const r = await this.pedir(`/payments/${encodeURIComponent(id)}`, {
      method: "GET",
    });
    if (!r.ok) return { estado: "pendiente" };
    const datos = (await r.json()) as {
      status?: string;
      amount?: number;
      transaction_id?: string;
    };
    const estado = ESTADOS[datos.status ?? ""] ?? "pendiente";
    if (estado === "pendiente") return { estado };
    return {
      estado,
      ...(typeof datos.amount === "number" ? { montoClp: datos.amount } : {}),
      ...(datos.transaction_id ? { referencia: datos.transaction_id } : {}),
    };
  }

  private pedir(ruta: string, init: RequestInit) {
    const fetchFn = this.config.fetch ?? fetch;
    return fetchFn(`${this.config.base}${ruta}`, {
      ...init,
      headers: {
        "x-api-key": this.config.apiKey,
        "content-type": "application/json",
      },
    });
  }
}
