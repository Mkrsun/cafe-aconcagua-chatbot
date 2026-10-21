import type { Escenario, TurnoDelBanco } from "./escenario.js";

/** Lo más largo que se lee cómodo en un mensaje de WhatsApp. */
const LARGO_MAXIMO = 700;

/** Una palabra entera; `\b` no entiende tildes y «botón» terminaría en «bot». */
const palabra = (alternativas: string) =>
  new RegExp(`(?<!\\p{L})(?:${alternativas})(?!\\p{L})`, "iu");

/** Lo que el cliente nunca debe leer, con su nombre en el informe (CLAUDE.md: voz y líneas). */
const PROHIBIDOS: readonly (readonly [string, RegExp])[] = [
  [
    "habla de bot, sistema o derivar",
    palabra("bot|sistema|asesor|deriv\\p{L}*"),
  ],
  ["voseo", palabra("querés|tenés|podés|sabés|vos|mirá|decime|contame")],
  ["muestra un SKU", /\bsku\b/i],
  ["quedó un marcador sin resolver", /\{\{/],
  ["resumen en $0", /Total: \$0\b/],
];

function fallosDelTexto(texto: string): string[] {
  const fallos = PROHIBIDOS.filter(([, patron]) => patron.test(texto)).map(
    ([nombre]) => nombre,
  );
  if (texto.length > LARGO_MAXIMO)
    fallos.push(
      `mensaje de ${texto.length} caracteres (más de ${LARGO_MAXIMO})`,
    );
  return fallos;
}

/**
 * Lo que salió mal en una conversación del banco: cómo terminó cada turno frente a lo esperado, lo
 * que no nombró, lo prohibido y los errores del modelo. Puro: el juicio fino lo hace quien lee.
 */
export function fallosDelEscenario(
  e: Escenario,
  turnos: readonly TurnoDelBanco[],
): string[] {
  return turnos.flatMap((t, i) => {
    const paso = e.pasos[i];
    const texto = t.chatbot.join("\n");
    const fallos: string[] = [];
    if (paso?.espera && paso.espera !== t.termino)
      fallos.push(`se esperaba ${paso.espera} y terminó en ${t.termino}`);
    for (const patron of paso?.menciona ?? [])
      if (!patron.test(texto)) fallos.push(`no menciona ${patron}`);
    fallos.push(...fallosDelTexto(texto));
    for (const l of t.llamadas)
      if (l.error) fallos.push(`el modelo falló (${l.error})`);
    return fallos.map((f) => `turno ${i + 1}: ${f}`);
  });
}
