import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { leerConfiguracion } from "../../launcher/config/configuracion.js";
import { ModeloOpenAI } from "../../src/modelo/adaptadores/modelo-openai.js";
import { CASOS } from "./casos.js";
import { fallosDelEscenario } from "./chequeos.js";
import type { ResultadoDelEscenario } from "./escenario.js";
import { informeEnMarkdown, resumenDeLlamadas, segundos } from "./informe.js";
import { mundoDelBanco } from "./mundo-del-banco.js";

/** Con razonamiento alto una inferencia puede tardar; el banco no corta antes que el modelo. */
const TIMEOUT_MS = 90_000;

function opciones() {
  const { values } = parseArgs({
    options: {
      esfuerzo: { type: "string" },
      casos: { type: "string" },
      salida: { type: "string", default: ".banco" },
    },
  });
  const config = leerConfiguracion(process.env);
  const esfuerzos = (
    values.esfuerzo ??
    config.modelo.reasoningEffort ??
    "medium"
  )
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const ids = values.casos?.split(",").map((c) => c.trim());
  const casos = ids ? CASOS.filter((c) => ids.includes(c.id)) : CASOS;
  if (!casos.length)
    throw new Error(`Ningún caso se llama así: ${values.casos}`);
  return { config, esfuerzos, casos, salida: values.salida! };
}

async function correr(esfuerzo: string, o: ReturnType<typeof opciones>) {
  const { modelo } = o.config;
  const real = new ModeloOpenAI({
    baseUrl: modelo.baseUrl,
    apiKey: modelo.apiKey,
    modelo: modelo.nombre,
    api: modelo.api,
    timeoutMs: TIMEOUT_MS,
    ...(esfuerzo === "-" ? {} : { reasoningEffort: esfuerzo }),
  });
  const banco = await mundoDelBanco(real, o.casos);
  const resultados: ResultadoDelEscenario[] = [];
  for (const escenario of o.casos) {
    process.stderr.write(`  ${esfuerzo} · ${escenario.id}\n`);
    const turnos = await banco.conversar(escenario);
    resultados.push({
      escenario,
      turnos,
      fallos: fallosDelEscenario(escenario, turnos),
    });
  }
  const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const base = join(o.salida, `${fecha}-${modelo.nombre}-${esfuerzo}`);
  const informe = { modelo: modelo.nombre, esfuerzo, fecha, resultados };
  writeFileSync(`${base}.md`, informeEnMarkdown(informe));
  writeFileSync(
    `${base}.json`,
    JSON.stringify(
      informe,
      (_k, v) => (v instanceof RegExp ? String(v) : v),
      2,
    ),
  );
  return { esfuerzo, base, resultados };
}

/**
 * `pnpm banco`: los casos de `casos.ts` contra el modelo REAL de `.env` (cuesta tokens). Cada
 * esfuerzo deja un informe en `.banco/` para leer y comparar. Opciones: `--esfuerzo low,medium`,
 * `--casos saludo,precio` y `--salida carpeta`.
 */
async function main() {
  const o = opciones();
  mkdirSync(o.salida, { recursive: true });
  console.error(
    `Banco: ${o.casos.length} casos con ${o.config.modelo.nombre} (${o.esfuerzos.join(", ")}). ` +
      "Usa el modelo real: gasta tokens de tu cuenta.",
  );
  const corridas = await Promise.all(o.esfuerzos.map((e) => correr(e, o)));
  for (const c of corridas) {
    const m = resumenDeLlamadas(c.resultados);
    const conFallos = c.resultados.filter((r) => r.fallos.length);
    console.log(
      `\n${c.esfuerzo}: ${c.resultados.length - conFallos.length}/` +
        `${c.resultados.length} sin fallos · ${m.outputTokens} tokens de salida · ` +
        `${segundos(m.latenciaMediaMs)} de media · ` +
        `informe en ${c.base}.md`,
    );
    for (const r of conFallos)
      for (const f of r.fallos) console.log(`  ⚠️ ${r.escenario.id}: ${f}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
