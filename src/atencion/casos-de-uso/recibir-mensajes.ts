import type { AvisoAlEquipo, SostenerLaPausa } from "../../bandeja/index.js";
import type { IRegistros } from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import { soloDigitos } from "../../plataforma/telefono.js";
import type { IBandeja } from "../../bandeja/puertos/bandeja.js";
import type { Cliente } from "../../clientes/dominio/cliente.js";
import type { IClientes } from "../../clientes/puertos/clientes.js";
import type { TiemposDeEspera } from "../../whatsapp/dominio/espera/tiempos.js";
import type { EventoEntrante } from "../../whatsapp/dominio/evento.js";
import {
  claveUltimoEntranteDeCliente,
  claveUltimoEntranteDeTelefono,
} from "../../whatsapp/dominio/ventana.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import type { IColaDeEntrantes } from "../../whatsapp/puertos/cola.js";
import type { IEntrantes } from "../../whatsapp/puertos/entrantes.js";
import { encolar, textoParaLaBandeja } from "./encolar.js";
import { ResponderDesconocido } from "./responder-desconocido.js";

export interface DepsRecibir {
  readonly entrantes: IEntrantes;
  readonly clientes: IClientes;
  readonly bandeja: IBandeja;
  readonly cola: IColaDeEntrantes;
  readonly registros: IRegistros;
  readonly canal: ICanal;
  readonly aviso: AvisoAlEquipo;
  readonly sostener: SostenerLaPausa;
  /** `CAFE_EQUIPO_WHATSAPP`: sus mensajes solo abren su ventana. */
  readonly equipo: readonly string[];
  readonly tiempos: TiemposDeEspera;
  readonly reloj: Reloj;
}

/**
 * Recibir lo que llega por el webhook: cada mensaje se reclama una vez, queda en la
 * bandeja y, si el chatbot atiende esa conversación, en la cola. Lo que falla va a carta muerta
 * y el webhook responde 500 para que Meta reintente.
 */
export class RecibirMensajes {
  private readonly desconocido: ResponderDesconocido;
  private readonly equipo: Set<string>;

  constructor(private readonly deps: DepsRecibir) {
    this.desconocido = new ResponderDesconocido(deps);
    this.equipo = new Set(deps.equipo.map(soloDigitos));
  }

  async ejecutar(eventos: readonly EventoEntrante[]): Promise<boolean> {
    let ok = true;
    for (const evento of eventos) {
      if (!(await this.deps.entrantes.reclamar(evento.id))) continue;
      try {
        await this.recibir(evento);
        await this.deps.entrantes.marcarProcesado(evento.id);
      } catch (error) {
        ok = false;
        await this.deps.entrantes.soltar(evento.id);
        await this.deps.entrantes.cartaMuerta({
          mensajeId: evento.id,
          datos: evento,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return ok;
  }

  private async recibir(evento: EventoEntrante): Promise<void> {
    const { registros, clientes, reloj } = this.deps;
    const marca = { at: reloj().toISOString() };
    await registros.guardar(
      claveUltimoEntranteDeTelefono(evento.telefono),
      marca,
    );
    if (this.equipo.has(soloDigitos(evento.telefono))) return;
    const cliente = await clientes.porTelefono(evento.telefono);
    if (!cliente) return this.desconocido.ejecutar(evento);
    // Una reacción no renueva la ventana del cliente (Meta no lo garantiza).
    if (evento.tipo !== "reaction")
      await registros.guardar(claveUltimoEntranteDeCliente(cliente.id), marca);
    await this.enLaBandeja(evento, cliente);
  }

  private async enLaBandeja(
    evento: EventoEntrante,
    cliente: Cliente,
  ): Promise<void> {
    const { bandeja, reloj } = this.deps;
    const conversacion = await bandeja.registrarCliente({
      clienteId: cliente.id,
      telefono: evento.telefono,
      texto: textoParaLaBandeja(evento),
      ...(evento.entrante ? { entrante: evento.entrante } : {}),
      ahora: reloj(),
    });
    if (evento.tipo === "reaction" || conversacion.estado === "asignada")
      return;
    if (conversacion.estado === "pausada") {
      const acuse = await this.deps.sostener.ejecutar(
        conversacion,
        etiqueta(cliente),
      );
      if (
        acuse &&
        (
          await this.deps.canal.enviar({
            telefono: evento.telefono,
            texto: acuse,
          })
        ).enviado
      )
        await bandeja.registrarChatbot(conversacion.id, acuse, reloj());
      return;
    }
    await encolar(this.deps, evento);
  }
}

/** Cómo se nombra al cliente en los avisos al equipo. */
export const etiqueta = (c: Cliente) =>
  `${c.nombre} (${c.telefonos[0] ?? "sin teléfono"})`;
