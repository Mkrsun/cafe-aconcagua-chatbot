/** Las variables de entorno que lee el producto. */
export type Entorno = Readonly<Record<string, string | undefined>>;

/** Un texto no vacío, o `undefined`. */
export const texto = (env: Entorno, nombre: string): string | undefined => {
  const valor = env[nombre]?.trim();
  return valor ? valor : undefined;
};

/** Un entero ≥ 0 con su valor por defecto; otra cosa es un error que nombra la variable. */
export function entero(
  env: Entorno,
  nombre: string,
  porDefecto: number,
): number {
  const valor = texto(env, nombre);
  if (valor === undefined) return porDefecto;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 0)
    throw new Error(`${nombre} debe ser un entero mayor o igual que 0`);
  return numero;
}

/** Un número ≥ 0 (con decimales) con su valor por defecto. */
export function numero(
  env: Entorno,
  nombre: string,
  porDefecto: number,
): number {
  const valor = texto(env, nombre);
  if (valor === undefined) return porDefecto;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0)
    throw new Error(`${nombre} debe ser un número ≥ 0`);
  return n;
}

/** Una lista separada por comas, sin vacíos. */
export const lista = (env: Entorno, nombre: string): string[] =>
  (texto(env, nombre) ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
