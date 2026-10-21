import { PerfilesDeCafe } from "../../catalogo/index.js";
import type { ICatalogoEditable } from "../../catalogo/puertos/catalogo.js";
import type { IRegistros } from "../../plataforma/registros/puerto.js";
import type { ITarifasDeDespacho } from "../../catalogo/puertos/tarifas.js";
import type { BaseDeFaq } from "../../faq/index.js";
import type {
  ClienteDefinido,
  DefinicionesDeCafe,
} from "../dominio/definiciones.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarCatalogo } from "./cargar-catalogo.js";
import { cargarClientes, type DepsCargarClientes } from "./cargar-clientes.js";
import { cargarDespacho } from "./cargar-despacho.js";
import { cargarPerfiles } from "./cargar-perfiles.js";
import { cargarPreguntas } from "./cargar-preguntas.js";

export interface DepsCargarDefiniciones extends DepsCargarClientes {
  readonly catalogo: ICatalogoEditable;
  readonly tarifas: ITarifasDeDespacho;
  readonly faq: BaseDeFaq;
  readonly registros: IRegistros;
}

/** Deja la base igual a las definiciones de Café y suma los clientes dados. */
export async function cargarDefiniciones(
  deps: DepsCargarDefiniciones,
  definiciones: DefinicionesDeCafe,
  clientes: readonly ClienteDefinido[] = [],
) {
  const r = resumenVacio();
  await cargarCatalogo(deps.catalogo, definiciones.catalogo, r);
  await cargarDespacho(deps.tarifas, definiciones.despacho, r);
  await cargarPreguntas(deps.faq, definiciones.preguntas, r);
  const familias = new Set(definiciones.catalogo.map((f) => f.familia));
  await cargarPerfiles(
    new PerfilesDeCafe(deps.registros),
    definiciones.perfiles,
    familias,
    r,
  );
  await cargarClientes(deps, clientes, r);
  return r;
}
