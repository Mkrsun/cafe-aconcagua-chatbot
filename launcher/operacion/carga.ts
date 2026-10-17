import pg from "pg";
import {
  cargarDefiniciones,
  type ClienteDefinido,
  type DefinicionesDeCafe,
} from "../../src/carga/index.js";
import { BaseDeFaq } from "../../src/faq/index.js";
import { migrar } from "../../src/plataforma/postgres/migraciones.js";
import { relojDelSistema } from "../../src/plataforma/reloj.js";
import { crearAlmacenes } from "../composicion/almacenes.js";

/** Migra la base y la deja igual a las definiciones, más los clientes dados. */
export async function cargarEnLaBase(
  databaseUrl: string,
  definiciones: DefinicionesDeCafe,
  clientes: readonly ClienteDefinido[] = [],
) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    await migrar(pool);
    const a = crearAlmacenes(pool);
    const deps = {
      ...a,
      faq: new BaseDeFaq(a.registros, relojDelSistema),
      ahora: relojDelSistema,
    };
    return await cargarDefiniciones(deps, definiciones, clientes);
  } finally {
    await pool.end();
  }
}
