import type { Plazo, TarifaDeDespacho } from "./tarifa.js";

export interface DespachoCotizado {
  /** El lugar como lo nombra la tarifa (la zona). */
  readonly zona: string;
  readonly montoClp: number;
  readonly gratis: boolean;
  readonly gratisDesdeClp?: number;
  readonly plazo: Plazo;
}

/** El despacho de un pedido con ese total de productos: gratis con monto 0 o desde el umbral. */
export function cotizarDespacho(
  tarifa: TarifaDeDespacho,
  totalProductosClp: number,
): DespachoCotizado {
  const gratis =
    tarifa.montoClp === 0 ||
    (tarifa.gratisDesdeClp !== undefined &&
      totalProductosClp >= tarifa.gratisDesdeClp);
  return {
    zona: tarifa.zona,
    montoClp: gratis ? 0 : tarifa.montoClp,
    gratis,
    ...(tarifa.gratisDesdeClp ? { gratisDesdeClp: tarifa.gratisDesdeClp } : {}),
    plazo: tarifa.plazo,
  };
}
