import { AsyncLocalStorage } from "node:async_hooks";
import type { IRegistros } from "./puerto.js";

/** Registros en memoria del proceso: desarrollo y pruebas. */
export class RegistrosEnMemoria implements IRegistros {
  private readonly datos = new Map<string, string>();
  private readonly colas = new Map<string, Promise<unknown>>();
  private readonly tomadas = new AsyncLocalStorage<ReadonlySet<string>>();

  async bajoLlave<T>(clave: string, trabajo: () => Promise<T>): Promise<T> {
    const propias = this.tomadas.getStore() ?? new Set<string>();
    if (propias.has(clave)) return trabajo();
    const anterior = this.colas.get(clave) ?? Promise.resolve();
    const turno = anterior
      .catch(() => undefined)
      .then(() =>
        this.tomadas.run(new Set([...propias, clave]), () => trabajo()),
      );
    this.colas.set(clave, turno);
    return turno;
  }

  async leer<T>(clave: string): Promise<T | undefined> {
    const texto = this.datos.get(clave);
    return texto === undefined ? undefined : (JSON.parse(texto) as T);
  }

  async guardar(clave: string, valor: unknown): Promise<void> {
    this.datos.set(clave, JSON.stringify(valor));
  }
}
