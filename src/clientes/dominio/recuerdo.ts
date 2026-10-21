/** Una nota breve sobre el cliente que sirve en otra conversación (método, molienda, su local). */
export interface NotaDelCliente {
  readonly texto: string;
  readonly en: string;
}

export interface RecuerdoDelCliente {
  readonly notas: readonly NotaDelCliente[];
}

export const RECUERDO_VACIO: RecuerdoDelCliente = { notas: [] };
export const MAXIMO_DE_NOTAS = 8;
const LARGO_MAXIMO = 140;

/**
 * Lo que nunca se guarda: montos (los pone el catálogo), RUT, teléfonos, correos y enlaces. Los
 * datos personales del cliente viven en su ficha del CRM, no en notas que lee el modelo.
 */
const SENSIBLE = [
  /\$\s?\d|\b\d[\d.]*\s?(?:pesos|clp|lucas?|lukas?)\b/i,
  /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/,
  /(?:\+?\d[\s-]?){8,}/,
  /\S+@\S+\.\S+/,
  /https?:\/\/|www\./i,
];

const guardable = (texto: string) =>
  texto.length > 0 &&
  texto.length <= LARGO_MAXIMO &&
  !SENSIBLE.some((p) => p.test(texto));

const clave = (texto: string) =>
  texto.toLocaleLowerCase("es").replace(/\s+/g, " ");

/** Suma las notas nuevas que se pueden guardar y no repiten una anterior; quedan las últimas. */
export function conNotas(
  r: RecuerdoDelCliente,
  nuevas: readonly string[],
  ahora: Date,
): RecuerdoDelCliente {
  const vistas = new Set(r.notas.map((n) => clave(n.texto)));
  const notas = [...r.notas];
  for (const cruda of nuevas) {
    const texto = cruda.trim().replace(/\s+/g, " ");
    if (!guardable(texto) || vistas.has(clave(texto))) continue;
    vistas.add(clave(texto));
    notas.push({ texto, en: ahora.toISOString() });
  }
  return { notas: notas.slice(-MAXIMO_DE_NOTAS) };
}

/** Sin la nota `numero` (desde 1, como las muestra la bandeja); sin número, sin ninguna. */
export const sinNota = (
  r: RecuerdoDelCliente,
  numero?: number,
): RecuerdoDelCliente =>
  numero === undefined
    ? RECUERDO_VACIO
    : { notas: r.notas.filter((_, i) => i !== numero - 1) };
