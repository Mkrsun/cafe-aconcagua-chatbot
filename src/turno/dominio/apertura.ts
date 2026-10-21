/** Lo que solo el sistema puede decir en un traspaso: a quién se avisa y cuándo responde. */
const PROMESA =
  /encargad|equipo|te (?:escrib|contact|respond|llam|avis)|ratito|pronto|en breve|derivo|deriv/i;
const MAXIMO = 160;

/**
 * La frase del modelo al traspasar, como apertura que nombra el tema («Sobre la factura para tu
 * cafetería…»). Se descarta si promete contacto o plazos (eso lo dice el sistema según si el aviso
 * salió), si trae marcadores, o si es más de una frase corta.
 */
export function aperturaDelModelo(texto: string): string | undefined {
  const frase = texto.trim().replace(/[.!…:;,\s]+$/u, "");
  if (!frase || frase.length > MAXIMO) return undefined;
  if (frase.includes("{{") || PROMESA.test(frase)) return undefined;
  if (/[.!?]\s+\S/u.test(frase)) return undefined;
  return frase;
}
