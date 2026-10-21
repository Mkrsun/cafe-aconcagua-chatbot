import { serve } from "@hono/node-server";
import pg from "pg";
import { migrar } from "../src/plataforma/postgres/migraciones.js";
import { relojDelSistema } from "../src/plataforma/reloj.js";
import { leerConfiguracion } from "./config/configuracion.js";
import { crearAplicacion } from "./composicion/aplicacion.js";
import { bordesReales } from "./composicion/bordes.js";

/** El único entrypoint ejecutable: configura, migra, sirve y despacha lotes vencidos. */
async function main() {
  const config = leerConfiguracion(process.env);
  const pool = config.databaseUrl
    ? new pg.Pool({ connectionString: config.databaseUrl, max: 10 })
    : undefined;
  if (pool) console.log("migraciones aplicadas:", await migrar(pool));
  else
    console.warn("Sin DATABASE_URL: todo queda en memoria (solo desarrollo).");
  if (!config.modelo.tarifa)
    console.warn(
      "Sin CAFE_MODELO_TARIFA_USD_POR_MTOK el límite de gasto no puede cortar.",
    );
  const { app, trabajos } = await crearAplicacion({
    config,
    ...(pool ? { pool } : {}),
    bordes: bordesReales(config),
    reloj: relojDelSistema,
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
  });
  let ocupado = false;
  const despachador = setInterval(() => {
    if (ocupado) return;
    ocupado = true;
    trabajos
      .despachar()
      .catch((error: unknown) => console.error("el despachador falló", error))
      .finally(() => (ocupado = false));
  }, config.despachoCadaMs);
  const servidor = serve(
    { fetch: app.fetch, port: config.puerto },
    ({ port }) =>
      console.log(`Chatbot de Café Aconcagua escuchando en :${port}`),
  );
  const cerrar = () => {
    clearInterval(despachador);
    servidor.close(() => void pool?.end());
  };
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
