import type pg from "pg";

/** Corre `trabajo` en una transacción; cualquier error la deshace. */
export async function enTransaccion<T>(
  pool: pg.Pool,
  trabajo: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const resultado = await trabajo(db);
    await db.query("COMMIT");
    return resultado;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }
}

/** Serializa las escrituras de un ámbito (catálogo, despacho) dentro de la transacción. */
export const bloquear = (db: pg.PoolClient, ambito: string) =>
  db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [ambito]);
