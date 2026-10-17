import pg from "pg";
import { URL_DE_PRUEBAS } from "../../src/plataforma/test-support/base-de-pruebas.js";

const conAdministrador = async (accion: (c: pg.Client) => Promise<void>) => {
  const admin = new pg.Client({ connectionString: URL_DE_PRUEBAS });
  await admin.connect();
  try {
    await accion(admin);
  } finally {
    await admin.end();
  }
};

/**
 * Una base vacía `cafe_test_<sufijo>` en el servidor de pruebas, solo para una suite: las
 * herramientas locales migran y escriben sin pisar las tablas de las demás suites.
 */
export async function basePropia(sufijo: string): Promise<string> {
  const nombre = `cafe_test_${sufijo}_${process.pid}`;
  await conAdministrador(async (admin) => {
    await admin.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${nombre}`);
  });
  const url = new URL(URL_DE_PRUEBAS!);
  url.pathname = `/${nombre}`;
  return url.toString();
}

export async function borrarBasePropia(urlDeLaBase: string) {
  const nombre = new URL(urlDeLaBase).pathname.slice(1);
  if (!nombre.startsWith("cafe_test_")) throw new Error(`no borro «${nombre}»`);
  await conAdministrador(async (admin) => {
    await admin.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
  });
}
