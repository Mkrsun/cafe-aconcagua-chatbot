import { readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, beforeEach, expect, it } from "vitest";
import {
  describirConPostgres,
  URL_DE_PRUEBAS,
} from "../test-support/base-de-pruebas.js";
import { MIGRACIONES, migrar } from "./migraciones.js";

/** Deja la base sin nada del producto: cada caso parte de cero. */
const borrarTodo = (pool: pg.Pool) =>
  pool.query("DROP SCHEMA IF EXISTS cafe CASCADE");

const leerMigracion = (nombre: string) =>
  readFile(new URL(`../../../migrations/${nombre}`, import.meta.url), "utf8");

describirConPostgres("migraciones del producto", () => {
  const pool = new pg.Pool({ connectionString: URL_DE_PRUEBAS, max: 2 });
  beforeEach(() => borrarTodo(pool));
  afterAll(async () => {
    await borrarTodo(pool);
    await migrar(pool);
    await pool.end();
  });

  it("se aplican una vez y quedan registradas; la segunda corrida no aplica nada", async () => {
    expect(await migrar(pool)).toEqual(MIGRACIONES);
    expect(await migrar(pool)).toEqual([]);
    const { rows } = await pool.query("SELECT version FROM cafe.migraciones");
    expect(rows).toHaveLength(MIGRACIONES.length);
  });

  it("cada archivo es idempotente: correrlo dos veces no falla", async () => {
    for (const nombre of MIGRACIONES) {
      const sql = await leerMigracion(nombre);
      await pool.query(sql);
      await pool.query(sql);
    }
  });

  it("todo queda en el esquema cafe: fuera de él no crea nada", async () => {
    const fuera = async () =>
      (
        await pool.query<{ tabla: string }>(
          `SELECT table_schema || '.' || table_name AS tabla
           FROM information_schema.tables
           WHERE table_schema NOT IN ('cafe', 'pg_catalog', 'information_schema')
           ORDER BY 1`,
        )
      ).rows;
    const antes = await fuera();
    await migrar(pool);
    expect(await fuera()).toEqual(antes);
  });

  it("la historia de los consentimientos no se modifica", async () => {
    await migrar(pool);
    await pool.query(`INSERT INTO cafe.clientes VALUES
      ('c1', 'Ana', 'minorista', 'minorista', 'activo', now(), now())`);
    await pool.query(`INSERT INTO cafe.cambios_de_consentimiento VALUES
      ('e1', 'c1', 'desconocido', 'otorgado', 'prueba', 'prueba', now())`);
    await expect(
      pool.query("DELETE FROM cafe.cambios_de_consentimiento"),
    ).rejects.toThrow(/no se modifica/);
  });

  it("una migración aplicada que cambió se rechaza", async () => {
    await migrar(pool);
    await pool.query(
      "UPDATE cafe.migraciones SET huella = 'otra' WHERE version = $1",
      [MIGRACIONES[0]],
    );
    await expect(migrar(pool)).rejects.toThrow(/cambió después de aplicarse/);
  });
});
