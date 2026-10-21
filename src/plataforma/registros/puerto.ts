/**
 * Registros duraderos (journal): documentos JSON por clave con exclusión entre procesos. Guardan lo
 * que no merece tabla propia: el estado del turno, el gasto del mes, las FAQ, la ventana de 24 h.
 * Real: `RegistrosPostgres` (`cafe.registros` + advisory locks) · fake: `RegistrosEnMemoria`.
 */
export interface IRegistros {
  /** Corre `trabajo` en exclusión por clave; anidar la misma clave no se bloquea. */
  bajoLlave<T>(clave: string, trabajo: () => Promise<T>): Promise<T>;
  leer<T>(clave: string): Promise<T | undefined>;
  guardar(clave: string, valor: unknown): Promise<void>;
}

/** La clave de un registro: sus partes (el tipo primero) en un string estable. */
export const claveDeRegistro = (...partes: readonly string[]) =>
  JSON.stringify(partes);
