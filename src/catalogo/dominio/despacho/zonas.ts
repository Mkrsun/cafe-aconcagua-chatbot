import { normalizar } from "../../../plataforma/texto.js";
import type { DatosDeTarifa, TarifaDeDespacho } from "./tarifa.js";

const lugaresDe = (t: Pick<DatosDeTarifa, "zona" | "comunas">) => [
  t.zona,
  ...t.comunas,
];

/**
 * La tarifa activa de lo que dijo el cliente: coincidencia exacta (normalizada) con el nombre de la
 * zona o una de sus comunas. No se adivina por parecido.
 */
export function tarifaPara(
  tarifas: readonly TarifaDeDespacho[],
  lugar: string,
): TarifaDeDespacho | undefined {
  const buscado = normalizar(lugar);
  if (!buscado) return undefined;
  return tarifas.find(
    (t) => t.activa && lugaresDe(t).some((l) => normalizar(l) === buscado),
  );
}

/** El lugar de `datos` que ya pertenece a otra tarifa, si hay uno (cada lugar, una sola tarifa). */
export function zonaRepetida(
  tarifas: readonly TarifaDeDespacho[],
  datos: Pick<DatosDeTarifa, "zona" | "comunas">,
  idPropio?: string,
): string | undefined {
  const ocupados = new Set(
    tarifas
      .filter((t) => t.id !== idPropio)
      .flatMap((t) => lugaresDe(t).map(normalizar)),
  );
  return lugaresDe(datos).find((l) => ocupados.has(normalizar(l)));
}

/** Las zonas activas con sus comunas, sin montos: lo que puede ver el modelo. */
export const zonasVisibles = (tarifas: readonly TarifaDeDespacho[]) =>
  tarifas
    .filter((t) => t.activa)
    .map((t) =>
      t.comunas.length ? `${t.zona}: ${t.comunas.join(", ")}` : t.zona,
    );
