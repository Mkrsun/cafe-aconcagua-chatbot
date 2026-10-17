/** Una cifra: 3990 · 3.990 · 1.250.000 · 2,5. */
const CIFRA = String.raw`\d+(?:[.,]\d+)*`;
const NUMERO_EN_PALABRAS =
  "(?:un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)";
const MONEDAS =
  "(?:clp|usd|eur|ars|pen|mxn|cop|uf|utm|pesos?|lucas?|lukas?|d[oó]lares?|euros?)";
const SIMBOLO = "(?:US\\$|[$＄€£])";
const PALABRAS_DE_PRECIO =
  "(?:precios?|valor(?:es)?|cuestan?|valen?|cobramos|tarifas?|costos?|montos?)";

/**
 * Lo que se lee como dinero: una
 * FAQ lleva horarios, teléfonos, direcciones y plazos, que no son montos.
 */
const PATRONES: readonly RegExp[] = [
  // $3.990 · $ 3990 · US$ 10 · €5 · 3.990 $
  new RegExp(`${SIMBOLO}\\s*${CIFRA}|${CIFRA}\\s*${SIMBOLO}`, "i"),
  // CLP 3990 · 3.990 CLP · 5.000 pesos · 5 lucas · dos mil pesos
  new RegExp(`\\b${MONEDAS}\\s*${CIFRA}`, "i"),
  new RegExp(
    `(?:${CIFRA}|${NUMERO_EN_PALABRAS})(?:\\s+mil)?\\s*${MONEDAS}\\b`,
    "i",
  ),
  // «precio … N»: una palabra de precio y una cifra en la misma oración.
  new RegExp(`\\b${PALABRAS_DE_PRECIO}\\b[^.!?\\n]{0,40}?\\d`, "i"),
  // «gratis sobre 30.000», «compra mínima 20.000»: un monto con punto de miles tras esas palabras.
  /\b(?:sobre|desde|m[ií]nim[oa]|gratis)\b[^.!?\n]{0,20}?\d{1,3}(?:\.\d{3})+(?!\d)/i,
];

/** ¿El texto trae un monto de dinero o un precio? Los precios los fija el catálogo, por código. */
export const contieneMonto = (texto: string): boolean =>
  PATRONES.some((patron) => patron.test(texto));
