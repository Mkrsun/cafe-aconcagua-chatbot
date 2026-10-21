import type { EventoEntrante, TipoDeEvento } from "../dominio/evento.js";
import { entranteDeMeta } from "./entrante-de-meta.js";

/** Avisos de sistema (cambió de número): no son una intervención del cliente. */
const IGNORADOS = new Set(["system", "unsupported_reaction"]);
const CON_MEDIA = new Set(["audio", "image", "sticker", "document"]);
const CON_ENTRANTE: Record<string, TipoDeEvento> = {
  interactive: "interactive",
  button: "interactive",
  location: "location",
  reaction: "reaction",
};

type MensajeCrudo = Record<string, unknown> & {
  id: string;
  from: string;
  type?: unknown;
  text?: { body?: unknown };
  context?: { id?: unknown };
};

function tipar(m: MensajeCrudo): EventoEntrante | undefined {
  const cita = typeof m.context?.id === "string" ? { citaA: m.context.id } : {};
  const base = { id: m.id, telefono: m.from, ...cita };
  const tipo = typeof m.type === "string" ? m.type : "";
  if (IGNORADOS.has(tipo)) return undefined;
  if (CON_ENTRANTE[tipo]) {
    const entrante = entranteDeMeta(tipo, m);
    return entrante
      ? { ...base, tipo: CON_ENTRANTE[tipo], entrante }
      : { ...base, tipo: "otro" };
  }
  if (tipo === "text") {
    const cuerpo = m.text?.body;
    return typeof cuerpo === "string" && cuerpo.trim()
      ? { ...base, tipo: "text", texto: cuerpo }
      : undefined;
  }
  if (CON_MEDIA.has(tipo)) {
    const leyenda = (m[tipo] as { caption?: unknown } | undefined)?.caption;
    return {
      ...base,
      tipo: tipo as TipoDeEvento,
      ...(typeof leyenda === "string" && leyenda.trim()
        ? { texto: leyenda }
        : {}),
    };
  }
  return { ...base, tipo: "otro" };
}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Los mensajes del payload oficial de Meta como eventos tipados; los estados no son mensajes. */
export function extraerEventos(payload: unknown): EventoEntrante[] {
  const entradas = lista((payload as { entry?: unknown } | null)?.entry);
  const mensajes = entradas
    .flatMap((e) => lista((e as { changes?: unknown })?.changes))
    .flatMap((c) =>
      lista((c as { value?: { messages?: unknown } })?.value?.messages),
    );
  return mensajes
    .filter((m): m is MensajeCrudo => {
      const crudo = m as Partial<MensajeCrudo> | null;
      return typeof crudo?.id === "string" && typeof crudo.from === "string";
    })
    .map(tipar)
    .filter((e): e is EventoEntrante => !!e);
}
