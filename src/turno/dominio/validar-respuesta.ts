import type { FotoDelCatalogo } from "../../catalogo/dominio/precio.js";
import { marcadoresInvalidos } from "./marcadores.js";

export type CodigoDeViolacion =
  | "monto_escrito"
  | "marcador_invalido"
  | "estado_afirmado"
  | "enlace_en_prosa"
  | "despacho_sin_zona"
  | "sku_inexistente";

export interface Violacion {
  readonly codigo: CodigoDeViolacion;
  readonly detalle: string;
}

const MONTO = /\$\s?\d|\(monto\)|\b\d[\d.]*\s?(?:pesos|clp|lucas?|lukas?)\b/i;
/** Miles con punto a la chilena («9.990»), salvo que sea un peso o volumen («1.000 gramos»). */
const MONTO_CON_MILES =
  /\b\d{1,3}(?:\.\d{3})+\b(?!\s?(?:g|grs?|gramos|kg|kilos?|ml)\b)/i;
/** Una cifra sin formato después de un verbo de precio («cuesta 9990»). */
const MONTO_CON_VERBO =
  /\b(?:sale|salen|cuesta|cuestan|vale|valen|precio|total|son)\s+(?:de\s+|en\s+|a\s+)?\d{4,}\b/i;
const escribeMonto = (texto: string) =>
  [MONTO, MONTO_CON_MILES, MONTO_CON_VERBO].some((patron) =>
    patron.test(texto),
  );
const ESTADO = new RegExp(
  [
    "\\b(?:tu|el|su) pedido (?:ya )?(?:quedo|esta|fue|va)\\s+" +
      "(?:pagado|despachado|enviado|en camino)\\b",
    "\\bya (?:despachamos|enviamos|recibimos tu pago|pagaste)\\b",
  ].join("|"),
);
const ENLACE = /https?:\/\//i;

const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Lo que la respuesta del modelo no puede traer: montos, marcadores inválidos,
 * afirmaciones de estado, enlaces, o `{{despacho}}` sin zona. Pura; sin lista negra de palabras.
 */
export function violaciones(
  texto: string,
  contexto: { readonly foto: FotoDelCatalogo; readonly hayZona: boolean },
): Violacion[] {
  const encontradas: Violacion[] = [];
  const agregar = (codigo: CodigoDeViolacion, detalle: string) =>
    encontradas.push({ codigo, detalle });
  if (escribeMonto(texto))
    agregar(
      "monto_escrito",
      "nunca escribas montos: usa {{precio:SKU}} o {{precios:FAMILIA}}",
    );
  for (const m of marcadoresInvalidos(texto, contexto.foto))
    agregar("marcador_invalido", `${m} no existe en el catálogo`);
  if (ESTADO.test(sinTildes(texto)))
    agregar(
      "estado_afirmado",
      "no afirmes estados del pedido: el sistema los informa",
    );
  if (ENLACE.test(texto))
    agregar("enlace_en_prosa", "no escribas enlaces: usa {{pago}}");
  if (texto.includes("{{despacho}}") && !contexto.hayZona)
    agregar(
      "despacho_sin_zona",
      "anota en despacho la comuna del cliente antes de {{despacho}}",
    );
  return encontradas;
}
