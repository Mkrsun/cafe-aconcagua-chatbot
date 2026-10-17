import type { DecisionDelTurno } from "../../src/turno/dominio/decision.js";
import type { MensajeEnviado } from "../dobles/graph.js";
import type { LlamadaAlModelo } from "../dobles/modelo.js";
import { clienteEnWhatsApp } from "./whatsapp.js";

export interface ServidorDeCafe {
  readonly url: string;
  bandeja(args: string[]): Promise<{ codigo: number | null; salida: string }>;
}

/** El producto de una prueba: su base, sus clientes de WhatsApp, la bandeja y los dobles. */
export class Cafe {
  readonly url: string;

  constructor(
    private readonly servidor: ServidorDeCafe,
    readonly baseDeDatos: string,
    private readonly dobles: string,
  ) {
    this.url = servidor.url;
  }

  /** `pnpm bandeja …` contra la base de esta prueba; falla si el comando falla. */
  async bandeja(...args: string[]) {
    const { codigo, salida } = await this.servidor.bandeja(args);
    if (codigo !== 0)
      throw new Error(`pnpm bandeja ${args.join(" ")}:\n${salida}`);
    return salida;
  }

  cliente(telefono: string) {
    return clienteEnWhatsApp(this.url, telefono);
  }

  async enviados(para?: string): Promise<MensajeEnviado[]> {
    const q = para ? `?para=${para}` : "";
    return (await fetch(`${this.dobles}/__dobles/graph/enviados${q}`)).json();
  }

  async guionar(cliente: string, decisiones: DecisionDelTurno[]) {
    await fetch(`${this.dobles}/__dobles/modelo/guion`, {
      method: "POST",
      body: JSON.stringify({ cliente, decisiones }),
    });
  }

  async llamadasAlModelo(): Promise<LlamadaAlModelo[]> {
    return (await fetch(`${this.dobles}/__dobles/modelo/llamadas`)).json();
  }

  /** Khipu confirma el pago y avisa al webhook del producto (que igual lo consulta). */
  async pagarEnKhipu(id: string) {
    await fetch(`${this.dobles}/__dobles/khipu/pagar`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    const r = await fetch(`${this.url}/payments/khipu/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payment_id: id }),
    });
    return r.status;
  }
}
