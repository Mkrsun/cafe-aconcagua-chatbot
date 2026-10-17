import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import type { ConversacionBandeja } from "../dominio/conversacion.js";
import { acuseEnPausa } from "../dominio/textos.js";
import type { AvisoAlEquipo } from "./aviso-al-equipo.js";

const SEIS_HORAS = 6 * 3_600_000;

export interface DepsSostenerLaPausa {
  readonly aviso: AvisoAlEquipo;
  readonly registros: IRegistros;
  readonly rol: string;
  readonly reloj: Reloj;
}

/**
 * Un mensaje a una conversación pausada: el chatbot no responde. Si el aviso del traspaso
 * había fallado, lo reintenta; si sigue sin salir, devuelve un único acuse cada 6 h.
 */
export class SostenerLaPausa {
  constructor(private readonly deps: DepsSostenerLaPausa) {}

  async ejecutar(
    c: ConversacionBandeja,
    cliente: string,
  ): Promise<string | undefined> {
    if (!c.motivoHandoff) return undefined;
    const avisado = await this.deps.aviso.notificar({
      tipo: "traspaso",
      cliente,
      motivo: c.motivoHandoff,
      resumen: c.resumenHandoff ?? "",
      conversacionId: c.id,
    });
    return avisado ? undefined : this.acuse(c.id);
  }

  private acuse(conversacionId: string) {
    const clave = claveDeRegistro("whatsapp-acuse-en-pausa", conversacionId);
    return this.deps.registros.bajoLlave(clave, async () => {
      const ahora = this.deps.reloj();
      const previo = await this.deps.registros.leer<{ at: string }>(clave);
      if (previo && ahora.getTime() - Date.parse(previo.at) < SEIS_HORAS)
        return undefined;
      await this.deps.registros.guardar(clave, { at: ahora.toISOString() });
      return acuseEnPausa(this.deps.rol);
    });
  }
}
