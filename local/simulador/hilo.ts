import type { MensajeEnviado, VistoEnviado } from "../../e2e/dobles/graph.js";
import { opcionesDe, type OpcionElegible } from "../conversar/mostrar.js";

/** Lo que escribió el cliente desde el simulador (el webhook no lo guarda en los dobles). */
export interface MensajeDelCliente {
  readonly id: string;
  readonly texto: string;
  readonly en: string;
}

/** Una burbuja del chat, lista para dibujar. */
export interface Burbuja {
  readonly de: "cliente" | "cafe";
  readonly en: string;
  readonly texto: string;
  /** Solo las del último mensaje de Café se pueden elegir. */
  readonly opciones: readonly OpcionElegible[];
  readonly enlace?: { readonly texto: string; readonly url: string };
  readonly pideUbicacion?: boolean;
}

export type EstadoDelChatbot = "libre" | "esperando" | "escribiendo";

function burbujaDeCafe(m: MensajeEnviado, ultimo: boolean): Burbuja {
  const enlace = m.interactivo?.action?.parameters;
  const texto = m.plantilla
    ? `Plantilla ${m.plantilla}: ${(m.parametros ?? []).join(" · ")}`
    : (m.texto ?? "");
  return {
    de: "cafe",
    en: m.en,
    texto,
    opciones: ultimo ? opcionesDe(m) : [],
    ...(enlace
      ? { enlace: { texto: enlace.display_text, url: enlace.url } }
      : {}),
    ...(m.interactivo?.type === "location_request_message"
      ? { pideUbicacion: true }
      : {}),
  };
}

/** El chat como lo ve el cliente en su teléfono, y si el chatbot le está respondiendo. */
export function armarHilo(
  delCliente: readonly MensajeDelCliente[],
  enviados: readonly MensajeEnviado[],
  leidos: readonly VistoEnviado[],
): { mensajes: Burbuja[]; estado: EstadoDelChatbot } {
  const deCafe = enviados.map((m, i) =>
    burbujaDeCafe(m, i === enviados.length - 1),
  );
  const mensajes = [
    ...delCliente.map((m): Burbuja => ({
      de: "cliente",
      en: m.en,
      texto: m.texto,
      opciones: [],
    })),
    ...deCafe,
  ].sort((a, b) => a.en.localeCompare(b.en));
  const ultimo = delCliente.at(-1);
  if (mensajes.at(-1)?.de !== "cliente" || !ultimo)
    return { mensajes, estado: "libre" };
  const escribiendo = leidos.some(
    (v) => v.mensajeId === ultimo.id && v.escribiendo,
  );
  return { mensajes, estado: escribiendo ? "escribiendo" : "esperando" };
}
