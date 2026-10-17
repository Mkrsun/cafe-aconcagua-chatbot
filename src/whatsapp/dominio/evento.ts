import type { ContenidoEntrante } from "./interactivos/entrantes.js";

/** Los tipos de mensaje que el chatbot distingue; lo demás cae en `otro`. */
export type TipoDeEvento =
  | "text"
  | "audio"
  | "image"
  | "sticker"
  | "document"
  | "interactive"
  | "location"
  | "reaction"
  | "otro";

/** Un mensaje del cliente por WhatsApp, ya tipado desde el payload de Meta. */
export interface EventoEntrante {
  readonly id: string;
  readonly telefono: string;
  readonly tipo: TipoDeEvento;
  /** El texto, o la leyenda de una imagen o documento. */
  readonly texto?: string;
  /** La elección, ubicación o reacción. */
  readonly entrante?: ContenidoEntrante;
  /** El cliente respondió citando este mensaje. */
  readonly citaA?: string;
}
