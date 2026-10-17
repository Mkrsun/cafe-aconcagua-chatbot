/**
 * Tarifa del modelo en USD por millón de tokens. Es configuración
 * (`CAFE_MODELO_TARIFA_USD_POR_MTOK`), nunca código: quien la configura la copia de la
 * página de precios del proveedor.
 */
export interface TarifaDelModelo {
  readonly entrada: number;
  readonly cacheada: number;
  readonly salida: number;
}

export interface Tokens {
  readonly inputTokens: number;
  /** Parte de `inputTokens` servida desde la caché del proveedor. */
  readonly cachedInputTokens?: number;
  readonly outputTokens: number;
}

/** El costo de una llamada, con los cacheados tarifados aparte (acotados a la entrada). */
export function calcularCostoUSD(t: Tokens, tarifa: TarifaDelModelo): number {
  const cacheados = Math.min(
    Math.max(t.cachedInputTokens ?? 0, 0),
    t.inputTokens,
  );
  return (
    ((t.inputTokens - cacheados) * tarifa.entrada +
      cacheados * tarifa.cacheada +
      t.outputTokens * tarifa.salida) /
    1_000_000
  );
}

/** `entrada,cacheada,salida` (números ≥ 0); otra forma es un error que nombra la variable. */
export function tarifaDesdeTexto(
  texto: string,
  variable: string,
): TarifaDelModelo {
  const valores = texto
    .split(",")
    .map((p) => (p.trim() === "" ? NaN : Number(p)));
  if (
    valores.length !== 3 ||
    !valores.every((v) => Number.isFinite(v) && v >= 0)
  )
    throw new Error(
      `${variable} debe ser "entrada,cacheada,salida" en USD por millón de tokens (números ≥ 0)`,
    );
  const [entrada, cacheada, salida] = valores as [number, number, number];
  return { entrada, cacheada, salida };
}
