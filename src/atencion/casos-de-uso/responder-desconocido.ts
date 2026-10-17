import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import { soloDigitos } from "../../plataforma/telefono.js";
import type { AvisoAlEquipo } from "../../bandeja/index.js";
import { TEXTOS } from "../../turno/dominio/textos.js";
import type { EventoEntrante } from "../../whatsapp/dominio/evento.js";
import { VENTANA_MS } from "../../whatsapp/dominio/ventana.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import { textoParaLaBandeja } from "./encolar.js";

export interface DepsDesconocido {
  readonly registros: IRegistros;
  readonly canal: ICanal;
  readonly aviso: AvisoAlEquipo;
  readonly reloj: Reloj;
}

/**
 * Un número que no está en el CRM: un acuse cordial cada 24 h y un aviso al equipo;
 * sin inferir ni cotizar. La marca se escribe solo si el acuse salió.
 */
export class ResponderDesconocido {
  constructor(private readonly deps: DepsDesconocido) {}

  async ejecutar(evento: EventoEntrante): Promise<void> {
    if (evento.tipo === "reaction") return;
    const digitos = soloDigitos(evento.telefono);
    const clave = claveDeRegistro("whatsapp-numero-desconocido", digitos);
    await this.deps.registros.bajoLlave(clave, async () => {
      const ahora = this.deps.reloj();
      const previo = await this.deps.registros.leer<{ at: string }>(clave);
      if (previo && ahora.getTime() - Date.parse(previo.at) < VENTANA_MS)
        return;
      await this.deps.aviso.notificar({
        tipo: "desconocido",
        cliente: digitos,
        motivo: "Un número que no está en el CRM escribió al chatbot",
        resumen: textoParaLaBandeja(evento),
        conversacionId: `desconocido:${digitos}`,
      });
      const envio = await this.deps.canal.enviar({
        telefono: evento.telefono,
        texto: TEXTOS.desconocido,
      });
      if (envio.enviado)
        await this.deps.registros.guardar(clave, { at: ahora.toISOString() });
    });
  }
}
