import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RelojFalso } from "../../plataforma/reloj-falso.js";
import { BandejaEnMemoria } from "../../bandeja/adaptadores/bandeja-en-memoria.js";
import { AvisoAlEquipo } from "../../bandeja/casos-de-uso/aviso-al-equipo.js";
import { SostenerLaPausa } from "../../bandeja/casos-de-uso/sostener-la-pausa.js";
import { Traspasar } from "../../bandeja/casos-de-uso/traspasar.js";
import { TarifasEnMemoria } from "../../catalogo/adaptadores/tarifas-en-memoria.js";
import { ClientesEnMemoria } from "../../clientes/adaptadores/clientes-en-memoria.js";
import type {
  IModelo,
  SolicitudAlModelo,
} from "../../modelo/puertos/modelo.js";
import { Turno } from "../../turno/casos-de-uso/turno.js";
import { fotoDePrueba } from "../../turno/test-support/catalogo-de-prueba.js";
import { CanalEnMemoria } from "../../whatsapp/adaptadores/canal-en-memoria.js";
import { ColaEnMemoria } from "../../whatsapp/adaptadores/cola-en-memoria.js";
import { EntrantesEnMemoria } from "../../whatsapp/adaptadores/entrantes-en-memoria.js";
import type { EventoEntrante } from "../../whatsapp/dominio/evento.js";
import { DespacharLotes } from "../casos-de-uso/despachar-lotes.js";
import { RecibirMensajes } from "../casos-de-uso/recibir-mensajes.js";
import { ResponderLote } from "../casos-de-uso/responder-lote.js";

export const CLIENTE = "56911112222";
export const EQUIPO = "56900000001";

/** Un modelo que responde con una función asíncrona (puede hacer llegar otro mensaje). */
export class ModeloDePrueba implements IModelo {
  readonly llamadas: SolicitudAlModelo[] = [];
  constructor(public responder: (s: SolicitudAlModelo) => Promise<unknown>) {}
  async completar(s: SolicitudAlModelo) {
    this.llamadas.push(s);
    return { json: await this.responder(s) };
  }
}

/** Atención completa en memoria: recibir, esperar, despachar y entregar. */
export function mundoDeAtencion(
  responder: (s: SolicitudAlModelo) => Promise<unknown>,
) {
  const reloj = new RelojFalso(new Date("2026-10-16T15:00:00.000Z"));
  const registros = new RegistrosEnMemoria();
  const canal = new CanalEnMemoria();
  const bandeja = new BandejaEnMemoria();
  const cola = new ColaEnMemoria();
  const entrantes = new EntrantesEnMemoria();
  const tarifas = new TarifasEnMemoria();
  const clientes = new ClientesEnMemoria([
    {
      id: "cli_1",
      nombre: "Emporio Uno",
      tipo: "mayorista-tienda",
      tramo: "mayorista",
      estado: "activo",
      telefonos: [CLIENTE],
      creadoEn: "2026-10-01T00:00:00.000Z",
      actualizadoEn: "2026-10-01T00:00:00.000Z",
    },
  ]);
  const modelo = new ModeloDePrueba(responder);
  const aviso = new AvisoAlEquipo({
    canal,
    registros,
    numeros: [EQUIPO],
    plantilla: { nombre: "handoff_alert", idioma: "es" },
    reloj: reloj.ahora,
  });
  const turno = new Turno({
    modelo,
    registros,
    catalogo: async () => fotoDePrueba(),
    tarifas: () => tarifas.listar(),
    faq: async () => [],
    perfiles: async () => [],
    registrarPedido: async () => {},
    cobrar: async () => undefined,
    reloj: reloj.ahora,
    rol: "la encargada",
  });
  const tiempos = {
    incompletoMs: 45_000,
    normalMs: 25_000,
    cierreMs: 8_000,
    techoMs: 180_000,
  };
  const recibir = new RecibirMensajes({
    entrantes,
    clientes,
    bandeja,
    cola,
    registros,
    canal,
    aviso,
    sostener: new SostenerLaPausa({
      aviso,
      registros,
      rol: "la encargada",
      reloj: reloj.ahora,
    }),
    equipo: [EQUIPO],
    tiempos,
    reloj: reloj.ahora,
  });
  const responderLote = new ResponderLote({
    cola,
    clientes,
    bandeja,
    canal,
    turno,
    traspasar: new Traspasar({ bandeja, aviso, rol: "la encargada" }),
    aviso,
    entrantes,
    reloj: reloj.ahora,
    reintentos: { intentos: 3, dormir: async () => {} },
  });
  const despachar = new DespacharLotes({
    cola,
    responder: responderLote,
    reloj: reloj.ahora,
  });
  let n = 0;
  const texto = (cuerpo: string, telefono = CLIENTE): EventoEntrante => ({
    id: `wamid.${++n}`,
    telefono,
    tipo: "text",
    texto: cuerpo,
  });
  return {
    reloj,
    registros,
    canal,
    bandeja,
    cola,
    entrantes,
    modelo,
    recibir,
    despachar,
    texto,
  };
}
