import { describe } from "vitest";
import pg from "pg";
import { migrar } from "../postgres/migraciones.js";

/**
 * La base de pruebas (`DATABASE_URL`); sin ella, las suites de PostgreSQL se saltan. Las suites
 * vacían tablas y aplican migraciones: solo corren contra una base propia `cafe_test*`. Cualquier
 * otra (una de desarrollo o de producción) es un error, nunca un salto silencioso.
 */
export const URL_DE_PRUEBAS = baseSegura(process.env.DATABASE_URL);

function baseSegura(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const nombre = new URL(url).pathname.replace(/^\//, "");
  if (!/^cafe_test/.test(nombre))
    throw new Error(
      `DATABASE_URL apunta a «${nombre}»: las pruebas solo corren contra una base cafe_test* ` +
        "propia (vacían tablas). Usa DATABASE_URL=postgresql://cafe@127.0.0.1:55432/cafe_test",
    );
  return url;
}

/** `describe` que solo corre con una base de pruebas configurada. */
export const describirConPostgres = URL_DE_PRUEBAS ? describe : describe.skip;

let compartido: pg.Pool | undefined;

/** Un pool de la base de pruebas con las migraciones aplicadas (una vez por archivo). */
export async function baseDePruebas(): Promise<pg.Pool> {
  if (!compartido) {
    compartido = new pg.Pool({ connectionString: URL_DE_PRUEBAS, max: 6 });
    await migrar(compartido);
  }
  return compartido;
}

/** Vacía las tablas que usa una suite (`CASCADE`: sin restos de otra suite). */
export async function vaciar(
  pool: pg.Pool,
  tablas: readonly string[],
): Promise<void> {
  await pool.query(`TRUNCATE ${tablas.join(", ")} CASCADE`);
}

export async function cerrarBaseDePruebas(): Promise<void> {
  await compartido?.end();
  compartido = undefined;
}
