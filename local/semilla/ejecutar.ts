import type { Entorno } from "../../launcher/config/lectores.js";
import { cargarEnLaBase } from "../../launcher/operacion/carga.js";
import type { ResumenDeCarga } from "../../src/carga/index.js";
import { baseDeDesarrollo, exigirBaseArriba } from "../base-de-desarrollo.js";
import {
  CLIENTES_DE_LA_SEMILLA,
  DEFINICIONES_DE_EJEMPLO,
} from "./definiciones-de-ejemplo.js";

/**
 * `pnpm semilla`: en una base de desarrollo, migra y la deja con el negocio de ejemplo (el
 * catálogo real de Café con algunos precios, dos zonas, tres preguntas y dos clientes).
 */
export async function ejecutarSemilla(env: Entorno): Promise<ResumenDeCarga> {
  const url = baseDeDesarrollo(env);
  await exigirBaseArriba(url);
  return cargarEnLaBase(url, DEFINICIONES_DE_EJEMPLO, CLIENTES_DE_LA_SEMILLA);
}
