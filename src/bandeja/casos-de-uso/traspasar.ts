import type { ConversacionBandeja } from "../dominio/conversacion.js";
import { traspaso, type TipoDeTraspaso } from "../dominio/textos.js";
import type { IBandeja } from "../puertos/bandeja.js";
import type { AvisoAlEquipo } from "./aviso-al-equipo.js";

export interface DepsTraspasar {
  readonly bandeja: IBandeja;
  readonly aviso: AvisoAlEquipo;
  /** `CAFE_ROL_ENCARGADO`. */
  readonly rol: string;
}

export interface PedidoDeTraspaso {
  readonly conversacion: ConversacionBandeja;
  readonly cliente: string;
  readonly tipo: TipoDeTraspaso;
  readonly motivo: string;
  readonly resumen: string;
}

/**
 * Le pasa la conversación a una persona: primero avisa al equipo y recién entonces
 * elige qué decir; deja la conversación pausada con motivo y resumen. Devuelve el texto al cliente.
 */
export class Traspasar {
  constructor(private readonly deps: DepsTraspasar) {}

  async ejecutar(p: PedidoDeTraspaso): Promise<string> {
    const avisado = await this.deps.aviso.notificar({
      tipo: "traspaso",
      cliente: p.cliente,
      motivo: p.motivo,
      resumen: p.resumen,
      conversacionId: p.conversacion.id,
    });
    await this.deps.bandeja.pausar(p.conversacion.id, p.motivo, p.resumen);
    const textos = traspaso(this.deps.rol, p.tipo);
    return avisado ? textos.avisado : textos.sinAviso;
  }
}
