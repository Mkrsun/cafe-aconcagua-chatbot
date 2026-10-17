import { DatosInvalidos } from "../../../plataforma/errores.js";

/** Plazo en días hábiles desde que el pedido sale. */
export interface Plazo {
  readonly desdeDias: number;
  readonly hastaDias: number;
}

export interface DatosDeTarifa {
  readonly zona: string;
  readonly comunas: readonly string[];
  /** 0 = sin costo en esa zona. */
  readonly montoClp: number;
  /** Desde ese total de productos (inclusive) el despacho es gratis. */
  readonly gratisDesdeClp?: number;
  readonly plazo: Plazo;
  readonly activa: boolean;
}

export interface TarifaDeDespacho extends DatosDeTarifa {
  readonly id: string;
  readonly revision: number;
  readonly actualizadaPor: string;
  readonly actualizadaEn: string;
}

export const MAXIMO_DE_TARIFAS = 100;

const largo = (valor: unknown, campo: string) => {
  const t = typeof valor === "string" ? valor.trim() : "";
  if (t.length < 2 || t.length > 60)
    throw new DatosInvalidos(`${campo} debe tener entre 2 y 60 caracteres`);
  return t;
};

const entero = (valor: unknown, campo: string, min: number, max: number) => {
  if (
    !Number.isSafeInteger(valor) ||
    (valor as number) < min ||
    (valor as number) > max
  )
    throw new DatosInvalidos(
      `${campo} debe ser un entero entre ${min} y ${max}`,
    );
  return valor as number;
};

function comunas(valor: unknown): readonly string[] {
  const lista = valor === undefined ? [] : valor;
  if (!Array.isArray(lista) || lista.length > 100)
    throw new DatosInvalidos("comunas debe ser una lista de hasta 100");
  return lista.map((c) => largo(c, "cada comuna"));
}

function plazo(valor: unknown): Plazo {
  const p = (valor ?? {}) as Record<string, unknown>;
  const desdeDias = entero(p.desdeDias, "plazo.desdeDias", 0, 60);
  const hastaDias = entero(p.hastaDias, "plazo.hastaDias", 0, 60);
  if (desdeDias > hastaDias)
    throw new DatosInvalidos(
      "plazo.desdeDias no puede ser mayor que hastaDias",
    );
  return { desdeDias, hastaDias };
}

/** Los datos de una tarifa, limpios y válidos. */
export function validarTarifa(crudo: Record<string, unknown>): DatosDeTarifa {
  if (crudo.activa !== undefined && typeof crudo.activa !== "boolean")
    throw new DatosInvalidos("activa debe ser verdadero o falso");
  const gratis = crudo.gratisDesdeClp;
  return {
    zona: largo(crudo.zona, "zona"),
    comunas: comunas(crudo.comunas),
    montoClp: entero(crudo.montoClp, "montoClp", 0, 1_000_000),
    ...(gratis === undefined || gratis === null
      ? {}
      : { gratisDesdeClp: entero(gratis, "gratisDesdeClp", 1, 100_000_000) }),
    plazo: plazo(crudo.plazo),
    activa: (crudo.activa as boolean | undefined) ?? true,
  };
}
