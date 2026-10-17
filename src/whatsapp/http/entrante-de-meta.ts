import type { ContenidoEntrante } from "../dominio/interactivos/entrantes.js";

type Crudo = Record<string, unknown>;

const objeto = (v: unknown): Crudo | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Crudo) : undefined;
const texto = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;
const numero = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function eleccion(i: Crudo | undefined): ContenidoEntrante | undefined {
  const origen = i?.type === "list_reply" ? "lista" : "boton";
  const r = objeto(i?.[origen === "lista" ? "list_reply" : "button_reply"]);
  const id = texto(r?.id);
  const titulo = texto(r?.title);
  if (!id || !titulo) return undefined;
  const descripcion = texto(r?.description);
  return {
    tipo: "eleccion",
    origen,
    eleccion: { id, titulo, ...(descripcion ? { descripcion } : {}) },
  };
}

function ubicacion(l: Crudo | undefined): ContenidoEntrante | undefined {
  const latitud = numero(l?.latitude);
  const longitud = numero(l?.longitude);
  if (latitud === undefined || longitud === undefined) return undefined;
  const nombre = texto(l?.name);
  const direccion = texto(l?.address);
  return {
    tipo: "ubicacion",
    ubicacion: {
      latitud,
      longitud,
      ...(nombre ? { nombre } : {}),
      ...(direccion ? { direccion } : {}),
    },
  };
}

/** La elección, ubicación o reacción de un mensaje de Meta; incompleto, `undefined`. */
export function entranteDeMeta(
  tipo: string,
  dato: Crudo,
): ContenidoEntrante | undefined {
  if (tipo === "interactive") return eleccion(objeto(dato.interactive));
  if (tipo === "location") return ubicacion(objeto(dato.location));
  if (tipo === "button") {
    const b = objeto(dato.button);
    const id = texto(b?.payload);
    const titulo = texto(b?.text);
    return id && titulo
      ? { tipo: "eleccion", origen: "boton", eleccion: { id, titulo } }
      : undefined;
  }
  if (tipo === "reaction") {
    const r = objeto(dato.reaction);
    const mensajeId = texto(r?.message_id);
    return mensajeId
      ? { tipo: "reaccion", mensajeId, emoji: texto(r?.emoji) ?? "" }
      : undefined;
  }
  return undefined;
}
