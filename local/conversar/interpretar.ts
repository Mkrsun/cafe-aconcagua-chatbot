import type { OpcionElegible } from "./mostrar.js";

/** Lo que la persona pidió con una línea de la terminal. */
export type Orden =
  | { readonly tipo: "texto"; readonly texto: string }
  | { readonly tipo: "eleccion"; readonly opcion: OpcionElegible }
  | { readonly tipo: "ubicacion" | "pagar" | "ayuda" | "salir" | "nada" };

const COMANDOS = {
  "/ubicacion": "ubicacion",
  "/pagar": "pagar",
  "/ayuda": "ayuda",
  "/salir": "salir",
} as const;

/**
 * Un número solo elige esa opción del último interactivo; un comando conocido es su orden; un
 * comando desconocido muestra la ayuda; lo demás es lo que el cliente escribe.
 */
export function interpretarLinea(
  linea: string,
  opciones: readonly OpcionElegible[],
): Orden {
  const texto = linea.trim();
  if (!texto) return { tipo: "nada" };
  if (texto.startsWith("/"))
    return { tipo: COMANDOS[texto as keyof typeof COMANDOS] ?? "ayuda" };
  const opcion = /^\d+$/.test(texto) ? opciones[Number(texto) - 1] : undefined;
  return opcion ? { tipo: "eleccion", opcion } : { tipo: "texto", texto };
}
