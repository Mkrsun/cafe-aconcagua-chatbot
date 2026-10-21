import { readFile } from "node:fs/promises";
import type { ClienteDefinido } from "../../src/carga/index.js";

/**
 * Los clientes de un archivo JSON (una lista de fichas). Viven fuera del repositorio porque son
 * datos personales; la carga valida cada ficha antes de escribir.
 */
export async function leerClientes(
  ruta: string,
): Promise<readonly ClienteDefinido[]> {
  const contenido: unknown = JSON.parse(await readFile(ruta, "utf8"));
  if (
    !Array.isArray(contenido) ||
    contenido.some((c) => !c || typeof c !== "object")
  )
    throw new Error(`${ruta} debe ser una lista de clientes en JSON`);
  return contenido as ClienteDefinido[];
}
