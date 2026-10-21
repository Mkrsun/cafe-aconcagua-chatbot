import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type pg from "pg";

/** Las migraciones del producto, en orden. Solo hacia adelante: nunca se edita una aplicada. */
export const MIGRACIONES: readonly string[] = [
  "001_esquema.sql",
  "002_clientes.sql",
  "003_contacto.sql",
  "004_conversaciones.sql",
  "005_pedidos.sql",
  "006_catalogo.sql",
  "007_whatsapp.sql",
  "008_registros.sql",
];

const CARPETA = new URL("../../../migrations/", import.meta.url);
/** Un número fijo: dos réplicas que arrancan a la vez migran de a una. */
const LLAVE_DE_MIGRACION = 712345678901235;

/**
 * Aplica cada migración una vez y la registra en `cafe.migraciones`. Devuelve las que aplicó en
 * esta corrida. Una migración aplicada que cambió es un error: la historia no se reescribe.
 */
export async function migrar(pool: pg.Pool): Promise<readonly string[]> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT pg_advisory_xact_lock($1)", [
      LLAVE_DE_MIGRACION,
    ]);
    await cliente.query("CREATE SCHEMA IF NOT EXISTS cafe");
    await cliente.query(`CREATE TABLE IF NOT EXISTS cafe.migraciones (
      version text PRIMARY KEY,
      huella text NOT NULL,
      aplicada_en timestamptz NOT NULL DEFAULT now())`);
    const aplicadas: string[] = [];
    for (const version of MIGRACIONES)
      if (await aplicar(cliente, version)) aplicadas.push(version);
    await cliente.query("COMMIT");
    return aplicadas;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

async function aplicar(cliente: pg.PoolClient, version: string) {
  const sql = await readFile(new URL(version, CARPETA), "utf8");
  const huella = createHash("sha256").update(sql).digest("hex");
  const { rows } = await cliente.query<{ huella: string }>(
    "SELECT huella FROM cafe.migraciones WHERE version = $1",
    [version],
  );
  if (rows[0]) {
    if (rows[0].huella !== huella)
      throw new Error(`La migración ${version} cambió después de aplicarse`);
    return false;
  }
  await cliente.query(sql);
  await cliente.query(
    "INSERT INTO cafe.migraciones (version, huella) VALUES ($1, $2)",
    [version, huella],
  );
  return true;
}
