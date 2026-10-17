import pg from "pg";
import {
  Conflicto,
  DatosInvalidos,
  FalloExterno,
  NoEncontrado,
} from "../src/plataforma/errores.js";
import { relojDelSistema } from "../src/plataforma/reloj.js";
import { leerConfiguracion } from "./config/configuracion.js";
import { crearAplicacion } from "./composicion/aplicacion.js";
import { bordesReales } from "./composicion/bordes.js";
import { ejecutarBandeja } from "./operacion/bandeja/comandos.js";

const FUERA_DE_VENTANA =
  "Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja enviar " +
  "plantillas aprobadas. Espera a que el cliente escriba o llámalo.";

/** Lo que se le explica a quien opera, sin trazas internas. */
function explicar(error: unknown) {
  if (error instanceof Conflicto && error.codigo === "fuera-de-ventana")
    return FUERA_DE_VENTANA;
  if (error instanceof DatosInvalidos) return error.detalle;
  if (error instanceof NoEncontrado || error instanceof FalloExterno)
    return error.message;
  return error instanceof Error ? error.message : String(error);
}

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
