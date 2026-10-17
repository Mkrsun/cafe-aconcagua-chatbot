import { AsyncLocalStorage } from "node:async_hooks";
import type pg from "pg";
import type { IRegistros } from "./puerto.js";

/**
 * Registros en `cafe.registros` con `pg_advisory_lock` por clave. Una
 * llave anidada reusa la conexión de la exterior (el advisory lock es reentrante por sesión).
 */
export class RegistrosPostgres implements IRegistros {
  private readonly conexion = new AsyncLocalStorage<pg.PoolClient>();

  constructor(private readonly pool: pg.Pool) {}

  async bajoLlave<T>(clave: string, trabajo: () => Promise<T>): Promise<T> {
    const heredada = this.conexion.getStore();
    if (heredada) return this.conLlave(heredada, clave, trabajo);
    const cliente = await this.pool.connect();
    try {
      return await this.conexion.run(cliente, () =>
        this.conLlave(cliente, clave, trabajo),
      );
    } finally {
      cliente.release();
    }
  }

  async leer<T>(clave: string): Promise<T | undefined> {
    const { rows } = await this.db().query<{ datos: T }>(
      "SELECT datos FROM cafe.registros WHERE clave = $1",
      [clave],
    );
    return rows[0]?.datos;
  }

  async guardar(clave: string, valor: unknown): Promise<void> {
    await this.db().query(
      `INSERT INTO cafe.registros (clave, datos) VALUES ($1, $2::jsonb)
       ON CONFLICT (clave) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now()`,
      [clave, JSON.stringify(valor)],
    );
  }

  private db(): pg.Pool | pg.PoolClient {
    return this.conexion.getStore() ?? this.pool;
  }

  private async conLlave<T>(
    cliente: pg.PoolClient,
    clave: string,
    trabajo: () => Promise<T>,
  ): Promise<T> {
    await cliente.query(
      "SELECT pg_advisory_lock(hashtextextended($1, 24062026))",
      [clave],
    );
    try {
      return await trabajo();
    } finally {
      await cliente.query(
        "SELECT pg_advisory_unlock(hashtextextended($1, 24062026))",
        [clave],
      );
    }
  }
}
