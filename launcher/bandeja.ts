import pg from "pg";
import { relojDelSistema } from "../src/plataforma/reloj.js";
import { leerConfiguracion } from "./config/configuracion.js";
import { crearAplicacion } from "./composicion/aplicacion.js";
import { bordesReales } from "./composicion/bordes.js";
import { ejecutarBandeja } from "./operacion/bandeja/comandos.js";
import { explicar } from "./operacion/bandeja/explicar.js";

/**
 * `pnpm bandeja …`: el equipo atiende las conversaciones desde la terminal, con la misma
 * configuración del servidor (base de datos y WhatsApp reales).
 */
async function main() {
  const config = leerConfiguracion(process.env);
  if (!config.databaseUrl)
    throw new Error("Falta DATABASE_URL: ¿qué bandeja abro?");
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 2 });
  try {
    const { almacenes, servicios } = await crearAplicacion({
      config,
      pool,
      bordes: bordesReales(config),
      reloj: relojDelSistema,
      dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    });
    const lineas = await ejecutarBandeja(
      {
        bandeja: almacenes.bandeja,
        clientes: almacenes.clientes,
        aviso: servicios.aviso,
        responder: servicios.responderDesdeBandeja,
      },
      process.argv.slice(2),
    );
    for (const linea of lineas) console.log(linea);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(explicar(error));
  process.exit(1);
});
