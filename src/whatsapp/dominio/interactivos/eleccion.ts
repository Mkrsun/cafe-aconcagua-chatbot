import type { OpcionDeRespuesta } from "./contenido.js";

/** La marca con que una elección entra al turno: el id estable, al final de su línea. */
const MARCA = /^(.*\S) \[opción: ([^\]\s]+)\]$/;

/** Una opción que el cliente tocó en un botón o en una lista. */
export interface EleccionDelCliente extends OpcionDeRespuesta {
  readonly descripcion?: string;
}

/**
 * El texto con que una elección entra al turno: lo que leyó el cliente más el id que puso el
 * sistema, para que el turno sepa exactamente qué eligió aunque dos títulos se parezcan.
 */
export const textoDeEleccion = (e: OpcionDeRespuesta): string =>
  `${e.titulo} [opción: ${e.id}]`;

/** La elección de la última línea del lote, si la hay, y el texto sin la marca. */
export function eleccionEnTexto(
  texto: string,
): (OpcionDeRespuesta & { readonly sinMarca: string }) | undefined {
  const lineas = texto.split("\n");
  const coincide = lineas.at(-1)?.match(MARCA);
  if (!coincide) return undefined;
  const [, titulo = "", id = ""] = coincide;
  return {
    id,
    titulo,
    sinMarca: [...lineas.slice(0, -1), titulo].join("\n"),
  };
}
