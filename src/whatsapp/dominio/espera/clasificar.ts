/** Cómo parece terminar lo que escribió el cliente. */
export type ClaseDeMensaje = "incompleto" | "normal" | "cierre";

const CONECTORES = new Set(
  (
    "y o u e pero que porque pq con de del para por a al en el la los las un una " +
    "ademas tambien entonces osea como cuando si ni"
  ).split(" "),
);

const SALUDOS = new Set([
  "hola",
  "holi",
  "holis",
  "ola",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "buen dia",
  "wena",
  "wenas",
  "alo",
  "hola buenas",
  "hola buenos dias",
  "hola buenas tardes",
  "hola buenas noches",
  "hola que tal",
  "hola como estas",
  "hola como esta",
]);

const DESPEDIDAS = [
  "gracias",
  "grax",
  "muchas gracias",
  "mil gracias",
  "eso seria todo",
  "eso es todo",
  "eso no mas",
  "eso nomas",
  "nada mas",
  "saludos",
  "slds",
  "quedo atento",
  "quedo atenta",
  "espero respuesta",
  "chao",
  "chau",
  "bendiciones",
  "por favor",
  "porfa",
  "porfavor",
  "xfa",
  "plis",
];

const RESPUESTAS_CORTAS = new Set(
  (
    "si|no|ok|oka|okay|dale|ya|listo|perfecto|bueno|va|claro|confirmo|correcto|exacto|" +
    "de acuerdo"
  ).split("|"),
);

/** Sin tildes, sin mayúsculas y sin lo que no es texto al final (emojis, espacios). */
const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}?!.,:…-]+$/u, "")
    .trim();

/** Solo las palabras, para comparar frases sin la puntuación de por medio. */
const palabrasDe = (texto: string): string[] =>
  texto
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const terminaEnPausa = (texto: string) => /([,:\-…]|\.\.\.)$/.test(texto);

const terminaEnConector = (texto: string, palabras: readonly string[]) =>
  !/[.!?]$/.test(texto) && CONECTORES.has(palabras.at(-1) ?? "");

const esRespuestaCorta = (palabras: readonly string[]) => {
  const todo = palabras.join(" ");
  return RESPUESTAS_CORTAS.has(todo) || /^\d+$/.test(todo);
};

const pareceCierre = (texto: string, palabras: readonly string[]) => {
  if (texto.endsWith("?")) return true;
  const final = ` ${palabras.slice(-5).join(" ")} `;
  return DESPEDIDAS.some((frase) => final.includes(` ${frase} `));
};

const esSoloSaludo = (palabras: readonly string[]) => {
  const sinPo = palabras.at(-1) === "po" ? palabras.slice(0, -1) : palabras;
  return SALUDOS.has(sinPo.join(" "));
};

/**
 * Clasifica el último mensaje del lote, sin modelo: lo que termina a medias manda, después el
 * cierre, y al final el saludo solo y lo muy corto (que casi siempre sigue). Un mensaje sin texto
 * (una foto, un audio que no se pudo leer) es normal.
 */
export function clasificarMensaje(texto: string | undefined): ClaseDeMensaje {
  const limpio = normalizar(texto ?? "");
  const palabras = palabrasDe(limpio);
  if (palabras.length === 0) return "normal";
  if (terminaEnPausa(limpio)) return "incompleto";
  // «sí» u «ok» son cortos, pero completan la pregunta del chatbot: no se los hace esperar.
  if (esRespuestaCorta(palabras)) return "cierre";
  if (terminaEnConector(limpio, palabras)) return "incompleto";
  if (pareceCierre(limpio, palabras)) return "cierre";
  if (esSoloSaludo(palabras)) return "incompleto";
  if (palabras.length <= 2 && !/[.!?]$/.test(limpio)) return "incompleto";
  return "normal";
}
