import {
  Conflicto,
  DatosInvalidos,
  FalloExterno,
  NoEncontrado,
} from "../../plataforma/errores.js";
import type { IRegistros } from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import {
  claveUltimoEntranteDeCliente,
  dentroDeLaVentana,
} from "../../whatsapp/dominio/ventana.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import type { IBandeja } from "../puertos/bandeja.js";

export interface DepsResponderDesdeBandeja {
  readonly bandeja: IBandeja;
  readonly canal: ICanal;
  readonly registros: IRegistros;
  readonly reloj: Reloj;
}

/**
 * Una persona del equipo le escribe al cliente por el mismo hilo. Texto libre solo
 * dentro de la ventana de 24 h; lo que WhatsApp no aceptó no queda como enviado.
 */
export class ResponderDesdeBandeja {
  constructor(private readonly deps: DepsResponderDesdeBandeja) {}

  async ejecutar(id: string, texto: unknown, autor: string) {
    const limpio = typeof texto === "string" ? texto.trim() : "";
    if (!limpio || limpio.length > 4096)
      throw new DatosInvalidos("texto debe tener entre 1 y 4096 caracteres");
    const { bandeja, canal, registros, reloj } = this.deps;
    const conversacion = await bandeja.obtener(id);
    if (!conversacion?.telefono)
      throw new NoEncontrado(`la conversación ${id}`);
    const ultimo = await registros.leer<{ at: string }>(
      claveUltimoEntranteDeCliente(conversacion.clienteId),
    );
    if (!dentroDeLaVentana(ultimo, reloj()))
      throw new Conflicto("fuera-de-ventana");
    const envio = await canal.enviar({
      telefono: conversacion.telefono,
      texto: limpio,
    });
    if (!envio.enviado)
      throw new FalloExterno(
        "no-enviado",
        envio.error ?? "WhatsApp no lo aceptó",
      );
    return bandeja.registrarHumano(id, limpio, autor, reloj());
  }
}
