/**
 * Respuestas breves como las escribe un cliente chileno: "sipo",
 * "ya po", "👍", "no po", "mejor no", "gracias", "chao". Una confirmación, un rechazo o un
 * agradecimiento no gastan inferencia. Conservador: si alguna palabra no es del vocabulario ("sí
 * pero cámbiame uno"), no clasifica y el mensaje lo interpreta el modelo.
 */
export interface RespuestaBreve {
  readonly tipo: "afirmativo" | "negativo" | "cierre";
  /** Trae un "gracias": sin nada que confirmar, un "ok, gracias" es un cierre. */
  readonly gracias: boolean;
}

const AFFIRMATIVE = new Set([
  "si",
  "sii",
  "sip",
  "sipo",
  "ya",
  "yapo",
  "dale",
  "listo",
  "lista",
  "bueno",
  "buenisimo",
  "perfecto",
  "vale",
  "ok",
  "oka",
  "okay",
  "okey",
  "okis",
  "deacuerdo",
  "estabien",
  "confirmo",
  "confirmado",
  "confirma",
  "confirmalo",
  "claro",
  "obvio",
  "bacan",
  "joya",
  "genial",
  "excelente",
  "correcto",
  "exacto",
  "eso",
  "metinca",
  "hagamoslo",
  "👍",
  "👌",
  "✅",
]);
const NEGATIVE = new Set([
  "no",
  "noo",
  "nop",
  "nopo",
  "nones",
  "nel",
  "nah",
  "paranada",
]);
const FAREWELL = new Set([
  "chao",
  "chau",
  "adios",
  "nosvemos",
  "hastaluego",
  "saludos",
]);
const CLOSING = new Set([...FAREWELL, "gracias", "buena", "🙏"]);
/** Palabras que acompañan pero no deciden nada por sí solas. */
const FILLER = new Set([
  "po",
  "pues",
  "porfa",
  "nomas",
  "mejor",
  "todavia",
  "aun",
  "entonces",
  "muchas",
  "mil",
  "igual",
  "asi",
]);
/** Frases de dos palabras que valen como una. */
const PHRASES: readonly (readonly [RegExp, string])[] = [
  [/\bde acuerdo\b/g, "deacuerdo"],
  [/\besta bien\b/g, "estabien"],
  [/\bpor favor\b/g, "porfa"],
  [/\bno mas\b/g, "nomas"],
  [/\bpara nada\b/g, "paranada"],
  [/\bme tinca\b/g, "metinca"],
  [/\bnos vemos\b/g, "nosvemos"],
  [/\bhasta luego\b/g, "hastaluego"],
];
const MAX_WORDS = 6;

const tokens = (text: string): string[] => {
  let flat = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Tonos de piel, selectores de variante y uniones de emoji: 👍🏽 ≡ 👍.
    .replace(/[\u{1F3FB}-\u{1F3FF}\uFE0F\u200D]/gu, "")
    .toLowerCase()
    .replace(/(\p{Extended_Pictographic})/gu, " $1 ")
    .replace(/[^\p{L}\p{Extended_Pictographic}\s]/gu, " ")
    // "siii" ≡ "si", "graciaaas" ≡ "gracias".
    .replace(/(\p{L})\1{2,}/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, word] of PHRASES) flat = flat.replace(pattern, word);
  return flat ? flat.split(" ") : [];
};

/** Clasifica una respuesta breve; `undefined` si no es inequívoca. */
export function clasificarRespuestaBreve(
  text: string,
): RespuestaBreve | undefined {
  // Una pregunta ("¿listo?", "ok?") no confirma ni rechaza: la interpreta el modelo.
  if (/[?¿]/.test(text)) return undefined;
  const words = tokens(text);
  if (!words.length || words.length > MAX_WORDS) return undefined;
  const known = (w: string) =>
    AFFIRMATIVE.has(w) || NEGATIVE.has(w) || CLOSING.has(w) || FILLER.has(w);
  if (!words.every(known)) return undefined;
  const has = (set: ReadonlySet<string>) => words.some((w) => set.has(w));
  const thanks = words.includes("gracias");
  const yes = has(AFFIRMATIVE);
  const no = has(NEGATIVE);
  if (yes && no) return undefined;
  // "todavía no" / "aún no" es "aún no decido", no un rechazo: no retira la propuesta vigente.
  if (no && words.some((w) => w === "todavia" || w === "aun")) return undefined;
  if (no) return { tipo: "negativo", gracias: thanks };
  // Una despedida nunca confirma: "ya, chao" se despide, no acepta un pedido.
  if (has(FAREWELL)) return { tipo: "cierre", gracias: thanks };
  if (yes) return { tipo: "afirmativo", gracias: thanks };
  if (has(CLOSING)) return { tipo: "cierre", gracias: thanks };
  return undefined;
}
