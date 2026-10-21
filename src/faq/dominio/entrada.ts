import { DatosInvalidos } from "../../plataforma/errores.js";
import { normalizar } from "../../plataforma/texto.js";
import { contieneMonto } from "./contiene-monto.js";

export const TEMAS = [
  "horarios",
  "ubicacion",
  "despacho",
  "pagos",
  "cambios",
  "facturacion",
  "pedidos",
  "productos",
  "general",
] as const;
export type Tema = (typeof TEMAS)[number];
export type EstadoDeEntrada = "borrador" | "publicada";

/** Una pregunta frecuente. */
export interface EntradaDeFaq {
  readonly id: string;
  readonly pregunta: string;
  /** Vacía solo en un borrador. */
  readonly respuesta: string;
  readonly tema: string;
  readonly estado: EstadoDeEntrada;
  /** Sube en cada cambio; una entrada sin versión cuenta como la 1. */
  readonly version?: number;
  readonly creadaEn: string;
  readonly actualizadoPor: string;
  readonly actualizadoEn: string;
}

export interface DatosDeEntrada {
  readonly pregunta: string;
  readonly respuesta: string;
  readonly tema: string;
}

export const MAXIMO_DE_ENTRADAS = 200;
export const LARGO_MAXIMO_DE_RESPUESTA = 800;
export const MENSAJE_SIN_PRECIOS =
  "Los precios salen del catálogo; no se escriben en la FAQ";

export const versionDe = (e: EntradaDeFaq): number => e.version ?? 1;

/** Dos preguntas son la misma si coinciden sin mayúsculas, tildes ni signos. */
export const clavePregunta = (pregunta: string) => normalizar(pregunta);

const texto = (valor: unknown, campo: string) => {
  if (valor !== undefined && typeof valor !== "string")
    throw new DatosInvalidos(`la ${campo} debe ser texto`);
  return (valor ?? "").trim();
};

/** Los datos de una entrada, limpios y válidos, sin montos. */
export function validarDatos(crudo: Record<string, unknown>): DatosDeEntrada {
  const pregunta = texto(crudo.pregunta, "pregunta");
  const respuesta = texto(crudo.respuesta, "respuesta");
  if (pregunta.length < 3 || pregunta.length > 200)
    throw new DatosInvalidos("la pregunta debe tener entre 3 y 200 caracteres");
  if (respuesta.length > LARGO_MAXIMO_DE_RESPUESTA)
    throw new DatosInvalidos(
      `la respuesta admite hasta ${LARGO_MAXIMO_DE_RESPUESTA} caracteres`,
    );
  if (!TEMAS.includes(crudo.tema as Tema))
    throw new DatosInvalidos(`el tema debe ser uno de: ${TEMAS.join(", ")}`);
  if (contieneMonto(pregunta) || contieneMonto(respuesta))
    throw new DatosInvalidos(MENSAJE_SIN_PRECIOS);
  return { pregunta, respuesta, tema: crudo.tema as Tema };
}
