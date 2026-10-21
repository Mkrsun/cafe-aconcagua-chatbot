import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import { clavePregunta, versionDe, type EntradaDeFaq } from "./entrada.js";

/** La entrada en la versión que vio quien edita; otra versión es un conflicto con la vigente. */
export function exigirVigente(
  entradas: readonly EntradaDeFaq[],
  id: string,
  version: unknown,
) {
  const actual = entradas.find((e) => e.id === id);
  if (!actual) throw new NoEncontrado(`la pregunta ${id}`);
  if (versionDe(actual) !== version)
    throw new Conflicto("version-vieja", actual);
  return actual;
}

/** Dos entradas no repiten pregunta; la que se edita puede conservar la suya. */
export function exigirPreguntaUnica(
  entradas: readonly EntradaDeFaq[],
  pregunta: string,
  idPropio?: string,
) {
  const clave = clavePregunta(pregunta);
  const otra = entradas.find(
    (e) => e.id !== idPropio && clavePregunta(e.pregunta) === clave,
  );
  if (otra) throw new Conflicto("pregunta-repetida", otra);
}
