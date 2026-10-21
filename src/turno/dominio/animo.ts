/**
 * Señales de enojo. Son ASIMÉTRICAS: un falso positivo pausa al chatbot y le entrega a una
 * persona un cliente contento (caro); uno negativo es barato, porque el `DERIVAR` del modelo
 * lo ataja. Solo escala lo inequívoco: pedir una persona, insulto dirigido,
 * MAYÚSCULAS o insistencia dentro de un reclamo, "nadie me responde".
 */
export type SenalDeEnojo =
  "insulto" | "mayusculas" | "reclamo-repetido" | "pide-persona";

export interface MoodInput {
  readonly texto: string;
  /** El mensaje es parte de un reclamo abierto. */
  readonly enReclamo: boolean;
}

/** Una expresión que calza con cualquiera de las alternativas (cada una en su línea, legible). */
const alguna = (...alternativas: string[]) =>
  new RegExp(alternativas.join("|"));

const INSULT_WORD =
  "(estafador\\w*|ladron\\w*|inutil\\w*|chant[ao]s?|incompetentes?|sinverguenzas?)";
/** Insulto dirigido al negocio o a quien atiende ("ustedes son…", "eres un…"): escala siempre. */
const AIMED_INSULT = alguna(
  `\\bustedes son (unos |unas )?${INSULT_WORD}\\b`,
  `\\beres (un |una )?${INSULT_WORD}\\b`,
  "\\b(ustedes son|eres) una (basura|mierda)\\b",
  "\\bque estafa lo que (me )?(hicieron|hacen)\\b",
  "\\bustedes (me|nos) (estafaron|robaron)\\b",
  "\\b(me|nos) (estafaron|robaron) ustedes\\b",
);
/**
 * Insulto sin destinatario explícito ("son unos ladrones", "¡qué estafa!", "esto es un robo"):
 * escala sólo dentro de un reclamo y si no es una pregunta.
 */
const COMPLAINT_INSULT = alguna(
  `\\bson (unos |unas )?${INSULT_WORD}\\b`,
  "\\bson una (basura|mierda)\\b",
  "\\bque (estafa|robo)\\b",
  "\\besto es un robo\\b",
  "\\b(es|esto es) una estafa\\b",
  "\\b(me|nos) (estafaron|robaron)\\b",
);
/** Groserías: solas no escalan ("ctm qué rico"); con un reclamo, sí. */
const PROFANITY =
  /\b(conchetumare|conchesumadre|ctm|csm|culiao\w*|aweona\w*|mierda)\b/;
/** Marcas de reclamo en el mismo mensaje ("llegó todo mal", "me cobraron"). */
const COMPLAINT_MARKER = alguna(
  "\\b(llego|llegaron|vino|vinieron)\\b[^.!?]{0,15}" +
    "\\b(mal|roto|rota|rotos|rotas|malo|mala|abiert[oa]s?|vencid[oa]s?)\\b",
  "\\breclamo\\b",
  "\\bme cobraron\\b",
  "\\bno me llego\\b",
);
const PERSON_TARGET =
  "(alguien|una persona|un humano|una humana|un ser humano|un ejecutivo|una ejecutiva|" +
  "el encargado|la encargada|tu jefe|tu jefa|el dueno|la duena|un supervisor|una supervisora)";
/** Preguntas de disponibilidad: un día, una hora, el horario o la tienda como lugar. */
const AVAILABILITY = alguna(
  "\\b(hoy|lunes|martes|miercoles|jueves|viernes|sabados?|domingos?|feriados?)\\b",
  "\\b(horario|horas?|abierto|abiertos|abren|abre|local|tienda)\\b",
);
/** Pedir que lo pasen con alguien: escala aunque nombre la tienda o las horas de espera. */
const ASKS_PERSON = alguna(
  `\\bhablar con ${PERSON_TARGET}\\b`,
  "\\bquiero (un|una) (humano|humana|persona)\\b",
  `\\b(pasame|pasenme|comunicame) con ${PERSON_TARGET}\\b`,
);
/** "Que me atienda alguien": con un día, una hora o la tienda es una pregunta de disponibilidad. */
const ASKS_ATTENTION = alguna(
  `\\bque me atienda ${PERSON_TARGET}\\b`,
  `\\bme atiende ${PERSON_TARGET}\\b`,
  "\\b(alguien|una persona) (que )?me atienda\\b",
);
/** Frustración inequívoca en cualquier contexto. */
const NOBODY_ANSWERS = /\bnadie (me )?(responde|contesta|pesca|atiende)\b/;
/**
 * Insistencia: sólo es "reclamo repetido" si ya se está reclamando, y sólo en forma de reclamo
 * ("llegó roto otra vez", "otra vez lo mismo", "ya les dije"); un "gracias de nuevo" no lo es.
 */
const INSISTS = alguna(
  "\\b(llego|llegaron|vino|vinieron)\\b[^.!?]{0,30}\\b(otra vez|de nuevo|nuevamente)\\b",
  "\\botra vez lo mismo\\b",
  "\\bya (les|te) (dije|escribi|avise|reclame|conte)\\b",
  "\\bvuelvo a (escribir|reclamar)\\b",
  "\\bsigo esperando\\b",
  "\\btodavia no (me )?(llega|responden|contestan)\\b",
);
const MIN_CAPS_LETTERS = 12;
const CAPS_RATIO = 0.7;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

const shouts = (text: string) => {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < MIN_CAPS_LETTERS) return false;
  const upper = letters.filter((l) => /\p{Lu}/u.test(l)).length;
  return upper / letters.length >= CAPS_RATIO;
};

/** Señales inequívocas de enojo, en orden fijo y sin repetir. Vacío: no se escala. */
export function senalesDeEnojo(input: MoodInput): SenalDeEnojo[] {
  const t = normalize(input.texto);
  const question = /[?¿]/.test(input.texto);
  const found: SenalDeEnojo[] = [];
  const complaint = input.enReclamo || COMPLAINT_MARKER.test(t);
  if (
    AIMED_INSULT.test(t) ||
    (input.enReclamo && !question && COMPLAINT_INSULT.test(t)) ||
    (complaint && PROFANITY.test(t))
  )
    found.push("insulto");
  if (input.enReclamo && shouts(input.texto)) found.push("mayusculas");
  if (NOBODY_ANSWERS.test(t) || (input.enReclamo && INSISTS.test(t)))
    found.push("reclamo-repetido");
  // "¿Me atiende alguien el sábado?" pregunta por horario, no pide una persona.
  if (ASKS_PERSON.test(t) || (ASKS_ATTENTION.test(t) && !AVAILABILITY.test(t)))
    found.push("pide-persona");
  return found;
}
