import type { ClaseDeMensaje } from "../dominio/espera/clasificar.js";
import type { EstadoDeEspera } from "../dominio/espera/vencimiento.js";
import type { TipoDeEvento } from "../dominio/evento.js";

/** Un mensaje que el chatbot debe responder, ya anotado en la bandeja. */
export interface MensajeEnCola {
  /** El id de Meta: da la idempotencia. */
  readonly id: string;
  /** El teléfono del cliente. */
  readonly contacto: string;
  /** El texto legible; sin él, el mensaje es una señal (foto, audio, sticker). */
  readonly texto?: string;
  readonly tipo: TipoDeEvento;
  /** Cómo quedó en la bandeja. */
  readonly textoCliente: string;
  readonly citaA?: string;
  readonly recibidoEn: Date;
}

/** Un lote que un despachador tomó para responderlo. */
export interface LoteEnCola {
  readonly id: string;
  readonly contacto: string;
  /** En orden de llegada. */
  readonly mensajes: readonly MensajeEnCola[];
  /** Cambia con cada mensaje: si cambió al ir a enviar, llegó algo mientras se generaba. */
  readonly version: number;
  /** Cuántas veces se descartó su respuesta por un mensaje nuevo (a lo más una). */
  readonly reprocesos: number;
  readonly tomas: number;
}

export type Vencer = (estado: EstadoDeEspera) => Date;
export type EstadoFinalDelLote = "entregado" | "descartado" | "fallido";

/**
 * La cola durable de la espera humana (borde: PostgreSQL). Real: `ColaPostgres` (varias réplicas
 * con `SKIP LOCKED`) · fake: `ColaEnMemoria`.
 */
export interface IColaDeEntrantes {
  /**
   * Suma el mensaje al lote abierto del contacto; si no hay, al que se genera y aún no se
   * re-procesó (su respuesta se descartará); si no, abre uno.
   */
  encolar(
    m: MensajeEnCola,
    clase: ClaseDeMensaje,
    vencer: Vencer,
  ): Promise<"encolado" | "duplicado">;
  /** Los lotes vencidos (o con el lease vencido), de a uno por contacto. */
  tomarVencidos(
    ahora: Date,
    opciones: { readonly leaseMs: number; readonly limite: number },
  ): Promise<readonly LoteEnCola[]>;
  /** Justo antes de enviar: `false` si llegó algo y el lote vuelve a esperar con todo junto. */
  confirmarEnvio(loteId: string, version: number): Promise<boolean>;
  cerrar(loteId: string, estado: EstadoFinalDelLote): Promise<void>;
}
