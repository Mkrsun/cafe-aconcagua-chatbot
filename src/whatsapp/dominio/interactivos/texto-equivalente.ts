import { filasDe, type ContenidoInteractivo } from "./contenido.js";

/** Lo que un canal sin pedido de ubicación ofrece en su lugar. */
export const ESCRIBIR_LA_DIRECCION =
  "Puedes escribirme la dirección y la comuna.";

const juntar = (...partes: (string | undefined)[]) =>
  partes.filter((p): p is string => !!p?.trim()).join("\n");

/**
 * El contenido como texto plano, sin perder información: lo guarda la bandeja y lo manda el canal
 * que no entiende el contenido. Las filas de una lista traen datos (el precio): van completas.
 */
export function textoEquivalente(c: ContenidoInteractivo): string {
  switch (c.tipo) {
    case "botones":
      return `${c.cuerpo}\n\nResponde: ${c.opciones.map((o) => o.titulo).join(" · ")}`;
    case "lista":
      return juntar(
        c.cuerpo,
        ...filasDe(c).map(
          (f) => `• ${f.titulo}${f.descripcion ? ` — ${f.descripcion}` : ""}`,
        ),
      );
    case "enlace":
      return c.cuerpo.includes(c.url)
        ? c.cuerpo
        : juntar(c.cuerpo, `${c.boton}: ${c.url}`);
    case "pedir-ubicacion":
      return juntar(c.cuerpo, ESCRIBIR_LA_DIRECCION);
    case "reaccion":
      return c.emoji;
  }
}
