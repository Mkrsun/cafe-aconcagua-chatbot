/** Una opción que el cliente puede tocar: el id lo pone el sistema y vuelve tal cual. */
export interface OpcionDeRespuesta {
  readonly id: string;
  readonly titulo: string;
}

export interface FilaDeLista extends OpcionDeRespuesta {
  readonly descripcion?: string;
}

export interface SeccionDeLista {
  readonly titulo?: string;
  readonly filas: readonly FilaDeLista[];
}

/**
 * Lo que un mensaje lleva además del texto, en el dominio y no como JSON de Meta. El
 * canal lo traduce; quien no lo entiende manda el texto equivalente.
 */
export type ContenidoInteractivo =
  | {
      readonly tipo: "botones";
      readonly cuerpo: string;
      readonly opciones: readonly OpcionDeRespuesta[];
    }
  | {
      readonly tipo: "lista";
      readonly cuerpo: string;
      readonly boton: string;
      readonly secciones: readonly SeccionDeLista[];
    }
  | {
      readonly tipo: "enlace";
      readonly cuerpo: string;
      readonly boton: string;
      readonly url: string;
    }
  | { readonly tipo: "pedir-ubicacion"; readonly cuerpo: string }
  /** `emoji` vacío quita la reacción. */
  | {
      readonly tipo: "reaccion";
      readonly mensajeId: string;
      readonly emoji: string;
    };

export const filasDe = (c: Extract<ContenidoInteractivo, { tipo: "lista" }>) =>
  c.secciones.flatMap((s) => s.filas);
