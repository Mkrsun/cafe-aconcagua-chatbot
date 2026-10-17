/** Lo que hizo una carga, para contárselo a quien la corrió. */
export interface ResumenDeCarga {
  readonly cambios: string[];
  readonly sinCambios: string[];
  /** Los precios que siguen sin monto: esas consultas las responde una persona. */
  readonly pendientes: string[];
}

export const resumenVacio = (): ResumenDeCarga => ({
  cambios: [],
  sinCambios: [],
  pendientes: [],
});
