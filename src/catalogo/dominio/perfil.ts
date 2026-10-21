import { DatosInvalidos } from "../../plataforma/errores.js";

/** Lo que el chatbot sabe del sabor de un café (su familia): notas, cuerpo, tueste, método. */
export interface PerfilDeCafe {
  readonly familia: string;
  readonly notas: string;
}

export const LARGO_MAXIMO_DE_NOTAS = 300;
/** Los montos los pone el catálogo: unas notas con precio quedarían viejas y el modelo las lee. */
const MONTO = /\$\s?\d|\b\d[\d.]*\s?(?:pesos|clp|lucas?|lukas?)\b/i;

export function validarPerfil(p: {
  readonly familia: string;
  readonly notas: string;
}): PerfilDeCafe {
  const familia = p.familia.trim();
  const notas = p.notas.trim();
  if (!familia)
    throw new DatosInvalidos("el perfil necesita la familia del café");
  if (notas.length > LARGO_MAXIMO_DE_NOTAS)
    throw new DatosInvalidos(
      `las notas de «${familia}» pasan de ${LARGO_MAXIMO_DE_NOTAS} caracteres`,
    );
  if (MONTO.test(notas))
    throw new DatosInvalidos(
      `las notas de «${familia}» no pueden traer montos`,
    );
  return { familia, notas };
}
