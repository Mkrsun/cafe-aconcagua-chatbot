import pg from "pg";

/**
 * La base de los e2e: el servidor del entorno de pruebas (`cafe_test`), nunca otra. Se lee una
 * variable propia para que una `DATABASE_URL` del entorno nunca termine vaciada por las pruebas.
 */
const BASE =
  process.env.CAFE_E2E_DATABASE_URL ??
  "postgresql://cafe@127.0.0.1:55432/cafe_test";

function exigirCafeTest(url: URL) {
  const nombre = url.pathname.slice(1);
  if (!nombre.startsWith("cafe_test"))
    throw new Error(
      `Los e2e solo usan bases cafe_test*: «${nombre}» no sirve.`,
    );
}

/** Una base nueva y vacía para una prueba (`cafe_test_e2e_<sufijo>`); el servidor la migra. */
export async function baseNueva(sufijo: string): Promise<string> {
  const base = new URL(BASE);
  exigirCafeTest(base);
  const nombre = `cafe_test_e2e_${sufijo.replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
  const admin = new pg.Client({ connectionString: base.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${nombre}`);
  } finally {
    await admin.end();
  }
  const url = new URL(base);
  url.pathname = `/${nombre}`;
  return url.toString();
}

/** Borra la base de una prueba que terminó. */
export async function borrarBase(urlDeLaBase: string) {
  const url = new URL(urlDeLaBase);
  exigirCafeTest(url);
  const admin = new pg.Client({ connectionString: BASE });
  await admin.connect();
  try {
    await admin.query(
      `DROP DATABASE IF EXISTS ${url.pathname.slice(1)} WITH (FORCE)`,
    );
  } finally {
    await admin.end();
  }
}
