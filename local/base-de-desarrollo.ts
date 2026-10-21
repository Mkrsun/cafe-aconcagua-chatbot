import pg from "pg";
import type { Entorno } from "../launcher/config/lectores.js";

const SERVIDORES_LOCALES = ["localhost", "127.0.0.1", "::1", "[::1]"];
const NOMBRE_DE_DESARROLLO = /^cafe_(dev|test)/;

/**
 * La `DATABASE_URL` si parece de desarrollo; si no, un error que dice por qué. Se
 * decide antes de conectarse: una base de producción nunca recibe ni una consulta.
 */
export function baseDeDesarrollo(env: Entorno): string {
  const texto = env.DATABASE_URL?.trim();
  if (!texto)
    throw new Error(
      "Falta DATABASE_URL en .env. Para la base de docker compose: " +
        "DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafe_dev",
    );
  if (env.CAFE_ENV?.trim() === "produccion")
    throw new Error(
      "CAFE_ENV=produccion: las herramientas locales no corren en producción.",
    );
  const url = new URL(texto);
  if (!SERVIDORES_LOCALES.includes(url.hostname))
    throw new Error(
      `La base está en «${url.hostname}», que no es local: solo se usa una base de tu computador.`,
    );
  const nombre = url.pathname.slice(1);
  if (!NOMBRE_DE_DESARROLLO.test(nombre))
    throw new Error(
      `La base «${nombre}» no parece de desarrollo: su nombre debe empezar por cafe_dev ` +
        "(o cafe_test en las pruebas).",
    );
  return texto;
}

/** Se conecta una vez a la base; si no hay nadie escuchando, explica cómo levantarla. */
export async function exigirBaseArriba(urlDeLaBase: string): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDeLaBase });
  try {
    await cliente.connect();
  } catch (error) {
    const { hostname, port } = new URL(urlDeLaBase);
    throw new Error(
      `No pude conectarme a PostgreSQL en ${hostname}:${port || 5432} ` +
        `(${error instanceof Error ? error.message : error}). ¿Está arriba la base? Con Docker: ` +
        "abre Docker Desktop y corre docker compose up -d (docker compose ps debe decir healthy).",
    );
  } finally {
    await cliente.end().catch(() => undefined);
  }
}
