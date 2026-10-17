import { Conflicto } from "../../plataforma/errores.js";

/** Un cambio del catálogo o del despacho: quién, qué y cómo estaba antes y después. */
export interface EventoDeAuditoria {
  readonly accion: string;
  readonly entidad: "formato" | "precio" | "zona";
  readonly entidadId: string;
  readonly actor: string;
  readonly antes?: unknown;
  readonly despues?: unknown;
  readonly en: string;
}

/** Control optimista: la escritura trae la revisión que vio; otra es un conflicto. */
export function exigirRevision<T>(
  vigente: T,
  revisionVigente: string | number,
  esperada: unknown,
): void {
  if (revisionVigente !== esperada)
    throw new Conflicto("revision-vieja", vigente);
}
