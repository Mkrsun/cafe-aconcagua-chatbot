import { DEFINICIONES_DE_CAFE } from "../definiciones/index.js";
import { texto } from "./config/lectores.js";
import { cargarEnLaBase } from "./operacion/carga.js";
import { leerClientes } from "./operacion/leer-clientes.js";

/**
 * `pnpm cargar [--clientes archivo.json]`: deja la base de `DATABASE_URL` igual a las
 * definiciones de Café (catálogo y precios, despacho y preguntas frecuentes) y crea o actualiza
 * los clientes del archivo.
 */
async function main() {
  const databaseUrl = texto(process.env, "DATABASE_URL");
  if (!databaseUrl) throw new Error("Falta DATABASE_URL: ¿qué base cargo?");
  const i = process.argv.indexOf("--clientes");
  const archivo = i >= 0 ? process.argv[i + 1] : undefined;
  if (i >= 0 && !archivo)
    throw new Error("--clientes necesita la ruta del archivo");
  const clientes = archivo ? await leerClientes(archivo) : [];
  const r = await cargarEnLaBase(databaseUrl, DEFINICIONES_DE_CAFE, clientes);
  for (const cambio of r.cambios) console.log(`  · ${cambio}`);
  if (r.pendientes.length)
    console.log(
      `Precios pendientes (${r.pendientes.length}): esas consultas las responde una persona.`,
    );
  console.log(
    `Carga lista: ${r.cambios.length} cambios, ${r.sinCambios.length} cosas ya estaban al día.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
