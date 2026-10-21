import {
  filasDe,
  type ContenidoInteractivo,
  type OpcionDeRespuesta,
} from "./contenido.js";

/** Límites de WhatsApp Cloud API: lo que no los cumple Meta lo rechaza, así que no sale. */
export const LIMITES = {
  cuerpo: 1024,
  cuerpoDeLista: 4096,
  botones: 3,
  tituloDeBoton: 20,
  idDeBoton: 256,
  textoDelBoton: 20,
  filas: 10,
  tituloDeFila: 24,
  descripcionDeFila: 72,
  idDeFila: 200,
  tituloDeSeccion: 24,
} as const;

export type Validacion =
  | { readonly valido: true }
  | { readonly valido: false; readonly motivo: string };

/** Largo como lo cuenta una persona: un emoji o una letra con tilde es un carácter. */
export const largo = (texto: string): number => [...texto].length;

const obligatorio = (t: string, max: number, nombre: string) =>
  !t.trim()
    ? `${nombre} vacío`
    : largo(t) > max
      ? `${nombre} de más de ${max}`
      : undefined;
const opcional = (t: string | undefined, max: number, nombre: string) =>
  t !== undefined && largo(t) > max ? `${nombre} de más de ${max}` : undefined;
const repetidas = (opciones: readonly OpcionDeRespuesta[]) =>
  new Set(opciones.map((o) => o.id)).size === opciones.length &&
  new Set(opciones.map((o) => o.titulo.trim().toLowerCase())).size ===
    opciones.length
    ? undefined
    : "opciones repetidas";
const https = (url: string) =>
  /^https:\/\/\S+$/.test(url) ? undefined : "la URL debe ser https";

function motivoDe(c: ContenidoInteractivo): string | undefined {
  switch (c.tipo) {
    case "botones":
      if (c.opciones.length < 1 || c.opciones.length > LIMITES.botones)
        return "de 1 a 3 botones";
      return [
        obligatorio(c.cuerpo, LIMITES.cuerpo, "cuerpo"),
        ...c.opciones.flatMap((o) => [
          obligatorio(o.titulo, LIMITES.tituloDeBoton, "título"),
          obligatorio(o.id, LIMITES.idDeBoton, "id"),
        ]),
        repetidas(c.opciones),
      ].find(Boolean);
    case "lista": {
      const filas = filasDe(c);
      if (filas.length < 1 || filas.length > LIMITES.filas)
        return "de 1 a 10 filas";
      return [
        obligatorio(c.cuerpo, LIMITES.cuerpoDeLista, "cuerpo"),
        obligatorio(c.boton, LIMITES.textoDelBoton, "texto del botón"),
        ...c.secciones.map((s) =>
          opcional(s.titulo, LIMITES.tituloDeSeccion, "sección"),
        ),
        ...filas.flatMap((f) => [
          obligatorio(f.titulo, LIMITES.tituloDeFila, "título de fila"),
          obligatorio(f.id, LIMITES.idDeFila, "id de fila"),
          opcional(f.descripcion, LIMITES.descripcionDeFila, "descripción"),
        ]),
        new Set(filas.map((f) => f.id)).size === filas.length
          ? undefined
          : "filas repetidas",
      ].find(Boolean);
    }
    case "enlace":
      return [
        obligatorio(c.cuerpo, LIMITES.cuerpo, "cuerpo"),
        obligatorio(c.boton, LIMITES.textoDelBoton, "texto del botón"),
        https(c.url),
      ].find(Boolean);
    case "pedir-ubicacion":
      return obligatorio(c.cuerpo, LIMITES.cuerpo, "cuerpo");
    case "reaccion":
      return c.mensajeId ? undefined : "reacción sin mensaje";
  }
}

/** Si el contenido cumple los límites (pura): quien arma uno inválido cae a texto. */
export function validarContenido(c: ContenidoInteractivo): Validacion {
  const motivo = motivoDe(c);
  return motivo ? { valido: false, motivo } : { valido: true };
}
