import { cargarEnLaBase } from "../../launcher/operacion/carga.js";
import type { DefinicionesDeCafe } from "../../src/carga/index.js";
import {
  ANA as ANA_DEFINIDA,
  EMPORIO as EMPORIO_DEFINIDO,
  NEGOCIO_DE_PRUEBA,
} from "../../src/carga/test-support/negocio-de-prueba.js";
import type { Cafe } from "./cafe.js";

const contacto = (c: typeof ANA_DEFINIDA) => ({
  nombre: c.nombre,
  telefono: c.telefonos[0]!,
});
export const ANA = contacto(ANA_DEFINIDA);
export const EMPORIO = contacto(EMPORIO_DEFINIDO);

/** El negocio como lo deja el equipo con `pnpm cargar`: catálogo, despacho, FAQ y clientes. */
export async function sembrarNegocio(
  cafe: Cafe,
  definiciones: DefinicionesDeCafe = NEGOCIO_DE_PRUEBA,
) {
  await cargarEnLaBase(cafe.baseDeDatos, definiciones, [
    ANA_DEFINIDA,
    EMPORIO_DEFINIDO,
  ]);
}
