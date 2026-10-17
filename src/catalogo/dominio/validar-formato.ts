import { DatosInvalidos } from "../../plataforma/errores.js";
import type { Formato } from "./formato.js";

export type FormatoNuevo = Formato;
export type CambiosDeFormato = Partial<
  Pick<Formato, "nombre" | "gramaje" | "disponible">
>;

const SKU = /^[A-Za-z0-9._-]{1,40}$/;
const FAMILIA = /^[a-z0-9-]{2,60}$/;

function texto(valor: unknown, campo: string, min: number, max: number) {
  const limpio = typeof valor === "string" ? valor.trim() : "";
  if (limpio.length < min || limpio.length > max)
    throw new DatosInvalidos(
      `${campo} debe tener entre ${min} y ${max} caracteres`,
    );
  return limpio;
}

function conPatron(valor: unknown, campo: string, patron: RegExp) {
  if (typeof valor !== "string" || !patron.test(valor))
    throw new DatosInvalidos(`${campo} inválido`);
  return valor;
}

const gramaje = (valor: unknown) =>
  valor === undefined || valor === ""
    ? undefined
    : texto(valor, "gramaje", 1, 20);

function disponible(valor: unknown): boolean {
  if (valor === undefined) return true;
  if (typeof valor !== "boolean")
    throw new DatosInvalidos("disponible debe ser verdadero o falso");
  return valor;
}

/** Un formato nuevo, limpio y válido. */
export function validarFormatoNuevo(
  crudo: Record<string, unknown>,
): FormatoNuevo {
  const g = gramaje(crudo.gramaje);
  return {
    sku: conPatron(crudo.sku, "sku", SKU),
    nombre: texto(crudo.nombre, "nombre", 2, 120),
    familia: conPatron(crudo.familia, "familia", FAMILIA),
    familiaNombre: texto(crudo.familiaNombre, "familiaNombre", 2, 120),
    ...(g ? { gramaje: g } : {}),
    disponible: disponible(crudo.disponible),
  };
}

/** Lo editable de un formato: nombre, gramaje y disponibilidad. El resto se ignora. */
export function validarCambios(
  crudo: Record<string, unknown>,
): CambiosDeFormato {
  return {
    ...(crudo.nombre !== undefined
      ? { nombre: texto(crudo.nombre, "nombre", 2, 120) }
      : {}),
    ...(crudo.gramaje !== undefined ? { gramaje: gramaje(crudo.gramaje) } : {}),
    ...(crudo.disponible !== undefined
      ? { disponible: disponible(crudo.disponible) }
      : {}),
  };
}

/** Un monto en pesos: entero positivo, o `null` para volver a pendiente. */
export function validarMonto(valor: unknown): number | null {
  if (valor === null) return null;
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor <= 0)
    throw new DatosInvalidos("montoClp debe ser un entero mayor que 0, o null");
  return valor;
}
