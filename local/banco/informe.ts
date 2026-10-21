import type { ResultadoDelEscenario } from "./escenario.js";

export interface InformeDelBanco {
  readonly modelo: string;
  readonly esfuerzo: string;
  readonly fecha: string;
  readonly resultados: readonly ResultadoDelEscenario[];
}

export function resumenDeLlamadas(
  resultados: readonly ResultadoDelEscenario[],
) {
  const llamadas = resultados.flatMap((r) =>
    r.turnos.flatMap((t) => t.llamadas),
  );
  const suma = (f: (l: (typeof llamadas)[number]) => number) =>
    llamadas.reduce((s, l) => s + f(l), 0);
  return {
    llamadas: llamadas.length,
    inputTokens: suma((l) => l.inputTokens),
    outputTokens: suma((l) => l.outputTokens),
    latenciaMediaMs: llamadas.length
      ? Math.round(suma((l) => l.latenciaMs) / llamadas.length)
      : 0,
    latenciaMaximaMs: Math.max(0, ...llamadas.map((l) => l.latenciaMs)),
    errores: llamadas.filter((l) => l.error).length,
  };
}

export const segundos = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const cita = (quien: string, texto: string) =>
  `> **${quien}:** ${texto.replace(/\n/g, "\n> ")}`;

function conversacion(r: ResultadoDelEscenario): string[] {
  const e = r.escenario;
  const lineas = [
    `### ${e.id} — ${e.descripcion}`,
    "",
    `_${e.cliente.nombre} (${e.cliente.tramo})_`,
    "",
  ];
  for (const t of r.turnos) {
    lineas.push(cita("Cliente", t.cliente.join(" / ")), ">");
    for (const m of t.chatbot) lineas.push(cita("Café", m), ">");
    for (const a of t.avisosAlEquipo)
      lineas.push(cita("Aviso al equipo", a.split("\n")[0]!), ">");
    const salida = t.llamadas.reduce((s, l) => s + l.outputTokens, 0);
    const ms = t.llamadas.reduce((s, l) => s + l.latenciaMs, 0);
    lineas.push(
      `> _${t.termino} · ${t.llamadas.length} llamada(s) · ` +
        `${salida} tokens de salida · ${segundos(ms)}_`,
      "",
    );
  }
  lineas.push(...r.fallos.map((f) => `- ⚠️ ${f}`), "");
  return lineas;
}

/** El informe para leer y comparar entre modelos o versiones del prompt. */
export function informeEnMarkdown(i: InformeDelBanco): string {
  const m = resumenDeLlamadas(i.resultados);
  const conFallos = i.resultados.filter((r) => r.fallos.length).length;
  return [
    `# Banco de conversaciones — ${i.modelo} (${i.esfuerzo})`,
    "",
    `_${i.fecha}_`,
    "",
    "| | | | |",
    "|---|---|---|---|",
    `| Casos | ${i.resultados.length} | Con fallos | ${conFallos} |`,
    `| Llamadas | ${m.llamadas} | Errores del modelo | ${m.errores} |`,
    `| Tokens de entrada | ${m.inputTokens} | Tokens de salida | ${m.outputTokens} |`,
    `| Latencia media | ${segundos(m.latenciaMediaMs)} | ` +
      `Latencia máxima | ${segundos(m.latenciaMaximaMs)} |`,
    "",
    ...i.resultados.flatMap(conversacion),
  ].join("\n");
}
