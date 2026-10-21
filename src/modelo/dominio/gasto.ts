import type { Tokens } from "./costo.js";

/** Lo que dejó una llamada: sin `tokens` no hubo uso informado; sin `costoUSD`, no hay tarifa. */
export interface Consumo {
  readonly tokens?: Tokens;
  readonly costoUSD?: number;
}

/** El acumulado de un mes de Chile. */
export interface GastoDelMes {
  readonly mes: string;
  readonly usd: number;
  readonly llamadas: number;
  readonly llamadasSinUso: number;
  readonly llamadasSinTarifa: number;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

const formatoMes = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
});

/** `AAAA-MM` en America/Santiago: cambiar de mes es cambiar de clave (se reinicia solo). */
export function mesDeChile(fecha: Date): string {
  const partes = formatoMes.formatToParts(fecha);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}`;
}

export const gastoVacio = (mes: string): GastoDelMes => ({
  mes,
  usd: 0,
  llamadas: 0,
  llamadasSinUso: 0,
  llamadasSinTarifa: 0,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
});

export function sumarConsumo(g: GastoDelMes, c: Consumo): GastoDelMes {
  const t = c.tokens;
  return {
    ...g,
    usd: g.usd + (c.costoUSD ?? 0),
    llamadas: g.llamadas + 1,
    llamadasSinUso: g.llamadasSinUso + (t ? 0 : 1),
    llamadasSinTarifa:
      g.llamadasSinTarifa + (t && c.costoUSD === undefined ? 1 : 0),
    inputTokens: g.inputTokens + (t?.inputTokens ?? 0),
    cachedInputTokens: g.cachedInputTokens + (t?.cachedInputTokens ?? 0),
    outputTokens: g.outputTokens + (t?.outputTokens ?? 0),
  };
}

export const UMBRALES = [50, 80, 100] as const;

/** El umbral más alto (en % del límite) que una suma cruza, si cruza alguno. */
export function umbralCruzado(antes: number, despues: number, limite: number) {
  return UMBRALES.filter((u) => {
    const corte = (limite * u) / 100;
    return antes < corte && despues >= corte;
  }).at(-1);
}

export const alertas = (usd: number, limite: number) =>
  UMBRALES.map((umbral) => ({
    umbral,
    alcanzado: usd >= (limite * umbral) / 100,
  }));
