import { randomUUID } from "node:crypto";
import {
  validarClienteNuevo,
  type Cliente,
  type DatosDeCliente,
} from "../../clientes/dominio/cliente.js";
import {
  consentimientoDeWhatsApp,
  validarPolitica,
  type PoliticaDeContacto,
} from "../../clientes/dominio/politica.js";
import type {
  IClientes,
  IPoliticasDeContacto,
} from "../../clientes/puertos/clientes.js";
import type { ClienteDefinido } from "../dominio/definiciones.js";
import type { ResumenDeCarga } from "../dominio/resumen.js";
import { ACTOR_DE_LA_CARGA } from "./cargar-catalogo.js";

export interface DepsCargarClientes {
  readonly clientes: IClientes;
  readonly politicas: IPoliticasDeContacto;
  readonly ahora: () => Date;
}

const validar = (c: ClienteDefinido) => ({
  datos: validarClienteNuevo({ ...c }),
  politica: validarPolitica({
    consentimiento: c.consentimiento,
    whatsapp: c.consentimiento,
    fuente: c.fuente,
  }),
});

const mismosDatos = (a: Cliente, d: DatosDeCliente) =>
  a.nombre === d.nombre &&
  a.tipo === d.tipo &&
  a.tramo === d.tramo &&
  a.telefonos.join() === d.telefonos.join();

const mismaPolitica = (a: PoliticaDeContacto, b: PoliticaDeContacto) =>
  consentimientoDeWhatsApp(a) === consentimientoDeWhatsApp(b) &&
  a.fuente === b.fuente;

/** Crea o actualiza cada cliente del archivo (por su teléfono); los demás quedan como están. */
export async function cargarClientes(
  deps: DepsCargarClientes,
  definidos: readonly ClienteDefinido[],
  r: ResumenDeCarga,
) {
  for (const { datos, politica } of definidos.map(validar)) {
    const id = await guardarFicha(deps, datos, r);
    const actual = await deps.politicas.de(id);
    if (mismaPolitica(actual, politica)) continue;
    await deps.politicas.guardar(id, politica, ACTOR_DE_LA_CARGA);
    r.cambios.push(
      `consentimiento de ${datos.nombre}: ${politica.consentimiento}`,
    );
  }
}

async function guardarFicha(
  { clientes, ahora }: DepsCargarClientes,
  datos: DatosDeCliente,
  r: ResumenDeCarga,
): Promise<string> {
  const en = ahora().toISOString();
  const actual = await buscar(clientes, datos.telefonos);
  if (!actual) {
    const id = `cli_${randomUUID()}`;
    const nuevo = { id, ...datos, estado: "activo" as const };
    await clientes.guardar({ ...nuevo, creadoEn: en, actualizadoEn: en });
    r.cambios.push(`cliente ${datos.nombre} creado`);
    return id;
  }
  if (mismosDatos(actual, datos)) r.sinCambios.push(`cliente ${datos.nombre}`);
  else {
    await clientes.guardar({ ...actual, ...datos, actualizadoEn: en });
    r.cambios.push(`cliente ${datos.nombre} actualizado`);
  }
  return actual.id;
}

async function buscar(clientes: IClientes, telefonos: readonly string[]) {
  for (const telefono of telefonos) {
    const cliente = await clientes.porTelefono(telefono);
    if (cliente) return cliente;
  }
  return undefined;
}
