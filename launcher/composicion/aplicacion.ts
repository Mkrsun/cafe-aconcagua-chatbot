import type pg from "pg";
import type { Reloj } from "../../src/plataforma/reloj.js";
import type { Configuracion } from "../config/configuracion.js";
import { crearAlmacenes } from "./almacenes.js";
import type { Bordes } from "./bordes.js";
import { crearServicios } from "./servicios.js";
import { crearServidor } from "./servidor.js";

export interface PiezasDeLaAplicacion {
  readonly config: Configuracion;
  /** Con base de datos, los almacenes de PostgreSQL (ya migrada). */
  readonly pool?: pg.Pool;
  readonly bordes: Bordes;
  readonly reloj: Reloj;
  readonly dormir: (ms: number) => Promise<void>;
}

/** El producto armado: el servidor HTTP, sus almacenes y el trabajo recurrente del despachador. */
export async function crearAplicacion(p: PiezasDeLaAplicacion) {
  const almacenes = crearAlmacenes(p.pool);
  const servicios = crearServicios({ ...p, almacenes });
  const app = crearServidor(p.config, servicios);
  return {
    app,
    almacenes,
    servicios,
    trabajos: { despachar: () => servicios.despachar.ejecutar() },
  };
}
