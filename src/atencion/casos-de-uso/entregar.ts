import type { AvisoAlEquipo, Traspasar } from "../../bandeja/index.js";
import type { Reloj } from "../../plataforma/reloj.js";
import type { ConversacionBandeja } from "../../bandeja/dominio/conversacion.js";
import type { IBandeja } from "../../bandeja/puertos/bandeja.js";
import type { Cliente } from "../../clientes/dominio/cliente.js";
import type { ResultadoDelTurno } from "../../turno/index.js";
import { textoEquivalente } from "../../whatsapp/dominio/interactivos/texto-equivalente.js";
import type { ICanal, MensajeSaliente } from "../../whatsapp/puertos/canal.js";
import { etiqueta } from "./recibir-mensajes.js";

export interface DepsEntregar {
  readonly bandeja: IBandeja;
  readonly canal: ICanal;
  readonly traspasar: Traspasar;
  readonly aviso: AvisoAlEquipo;
  readonly reloj: Reloj;
  readonly reintentos: {
    readonly intentos: number;
    readonly dormir: (ms: number) => Promise<void>;
  };
}

/**
 * Entrega el resultado del turno: un traspaso avisa y pausa antes de
 * hablar; un reclamo se registra y se avisa como información. El envío se reintenta con la misma
 * respuesta; lo que salió queda en la bandeja.
 */
export class Entregar {
  constructor(private readonly deps: DepsEntregar) {}

  async ejecutar(
    c: ConversacionBandeja,
    cliente: Cliente,
    r: ResultadoDelTurno,
  ): Promise<boolean> {
    const mensaje = await this.preparar(c, cliente, r);
    if (!mensaje.texto.trim()) return true;
    for (let intento = 0; intento < this.deps.reintentos.intentos; intento++) {
      const envio = await this.deps.canal
        .enviar(mensaje)
        .catch(() => ({ enviado: false }));
      if (envio.enviado) {
        const texto = mensaje.contenido
          ? textoEquivalente(mensaje.contenido)
          : mensaje.texto;
        await this.deps.bandeja.registrarChatbot(
          c.id,
          texto,
          this.deps.reloj(),
          mensaje.contenido,
        );
        return true;
      }
      await this.deps.reintentos.dormir(500 * 2 ** intento);
    }
    return false;
  }

  private async preparar(
    c: ConversacionBandeja,
    cliente: Cliente,
    r: ResultadoDelTurno,
  ): Promise<MensajeSaliente> {
    const telefono = c.telefono ?? cliente.telefonos[0] ?? "";
    if (r.traspaso) {
      const texto = await this.deps.traspasar.ejecutar({
        conversacion: c,
        cliente: etiqueta(cliente),
        ...r.traspaso,
      });
      return { telefono, texto };
    }
    if (r.reclamo) {
      await this.deps.bandeja.registrarReclamo(c.id, r.reclamo);
      await this.deps.aviso.notificar({
        tipo: "reclamo",
        cliente: etiqueta(cliente),
        ...r.reclamo,
        conversacionId: c.id,
      });
    }
    return {
      telefono,
      texto: r.texto,
      ...(r.contenido ? { contenido: r.contenido } : {}),
    };
  }
}
