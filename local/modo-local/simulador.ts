import pg from "pg";
import { crearAplicacion } from "../../launcher/composicion/aplicacion.js";
import { bordesReales } from "../../launcher/composicion/bordes.js";
import { leerConfiguracion } from "../../launcher/config/configuracion.js";
import { RecuerdosDeClientes } from "../../src/clientes/index.js";
import { relojDelSistema } from "../../src/plataforma/reloj.js";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import { ChatbotLocal } from "../conversar/chatbot-local.js";
import {
  EQUIPO_DE_EJEMPLO,
  SECRETO_DE_DESARROLLO,
} from "../entorno-de-desarrollo.js";
import { crearSimulador } from "../simulador/api.js";

/**
 * El simulador con las piezas del producto armadas en este proceso, sobre la misma base: la
 * bandeja, los avisos y el gasto se leen y se operan igual que con `pnpm bandeja`.
 */
export async function simuladorLocal(
  entorno: Record<string, string>,
  direcciones: { servidor: string; dobles: string },
) {
  const config = leerConfiguracion(entorno);
  const pool = new pg.Pool({ connectionString: entorno.DATABASE_URL, max: 2 });
  const { almacenes, servicios } = await crearAplicacion({
    config,
    pool,
    bordes: bordesReales(config),
    reloj: relojDelSistema,
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
  });
  const simulador = crearSimulador({
    clientes: Object.values(CLIENTES_DE_EJEMPLO),
    equipo: EQUIPO_DE_EJEMPLO,
    telefono: new ChatbotLocal(
      direcciones.servidor,
      direcciones.dobles,
      SECRETO_DE_DESARROLLO,
    ),
    gasto: servicios.gasto,
    bandeja: {
      bandeja: almacenes.bandeja,
      clientes: almacenes.clientes,
      aviso: servicios.aviso,
      responder: servicios.responderDesdeBandeja,
      recuerdos: new RecuerdosDeClientes(almacenes.registros),
    },
  });
  return { simulador, cerrar: () => pool.end() };
}
