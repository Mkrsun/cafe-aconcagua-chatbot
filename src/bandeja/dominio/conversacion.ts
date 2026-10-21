import type { ContenidoInteractivo } from "../../whatsapp/dominio/interactivos/contenido.js";
import type { ContenidoEntrante } from "../../whatsapp/dominio/interactivos/entrantes.js";

export type EstadoDeConversacion =
  "abierta" | "pausada" | "asignada" | "resuelta";
export const ESTADOS: readonly EstadoDeConversacion[] = [
  "abierta",
  "pausada",
  "asignada",
  "resuelta",
];

export interface MensajeBandeja {
  readonly id: string;
  readonly autor: "cliente" | "chatbot" | "humano";
  readonly texto: string;
  readonly creadoEn: string;
  /** Quién del equipo escribió (solo `humano`). */
  readonly autorNombre?: string;
  /** Lo interactivo que se le mandó al cliente; `texto` es su equivalente legible. */
  readonly interactivo?: ContenidoInteractivo;
  /** La elección, ubicación o reacción del cliente. */
  readonly entrante?: ContenidoEntrante;
}

/** Una conversación de la bandeja, con su hilo. */
export interface ConversacionBandeja {
  readonly id: string;
  readonly clienteId: string;
  readonly canal: "whatsapp";
  readonly telefono?: string;
  readonly estado: EstadoDeConversacion;
  readonly propietario?: string;
  readonly prioridad: "normal" | "alta" | "urgente";
  /** Por qué se pausó (traspaso) o qué se registró (reclamo). */
  readonly motivoHandoff?: string;
  /** Dos líneas: qué dijo el cliente y qué importa para retomarlo. */
  readonly resumenHandoff?: string;
  readonly mensajes: readonly MensajeBandeja[];
  readonly creadaEn: string;
  readonly actualizadaEn: string;
}

/** Lo que el chatbot anota de un reclamo: motivo y resumen, o que llegaron fotos. */
export interface RegistroDeReclamo {
  readonly motivo?: string;
  readonly resumen?: string;
  readonly imagenes?: number;
}

export const MOTIVO_RECLAMO = "Reclamo registrado por el chatbot";
export const MARCA_FOTOS = "Adjuntó fotos (en la bandeja).";
