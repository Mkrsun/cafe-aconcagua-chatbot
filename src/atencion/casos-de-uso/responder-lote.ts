import type { AvisoAlEquipo, Traspasar } from "../../bandeja/index.js";
import type { Reloj } from "../../plataforma/reloj.js";
import type { IBandeja } from "../../bandeja/puertos/bandeja.js";
import { MOTIVO_RECLAMO } from "../../bandeja/dominio/conversacion.js";
import type { IClientes } from "../../clientes/puertos/clientes.js";
import type { ResultadoDelTurno, EntradaDelTurno } from "../../turno/index.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import type {
  IColaDeEntrantes,
  LoteEnCola,
} from "../../whatsapp/puertos/cola.js";
import type { IEntrantes } from "../../whatsapp/puertos/entrantes.js";
import { acuseDelLote } from "./acuse-del-lote.js";
import { Entregar } from "./entregar.js";

export interface DepsResponderLote {
  readonly cola: IColaDeEntrantes;
  readonly clientes: IClientes;
  readonly bandeja: IBandeja;
  readonly canal: ICanal;
  readonly turno: {
    atender(e: EntradaDelTurno): Promise<ResultadoDelTurno>;
    confirmar(e: EntradaDelTurno): Promise<void>;
  };
  readonly traspasar: Traspasar;
  readonly aviso: AvisoAlEquipo;
  readonly entrantes: IEntrantes;
  readonly reloj: Reloj;
  readonly reintentos: {
    readonly intentos: number;
    readonly dormir: (ms: number) => Promise<void>;
  };
}

/** Un lote tomado tantas veces sin terminar se deja para revisión: no se repite sin fin. */
const MAXIMO_DE_TOMAS = 5;

/**
 * Responde un lote vencido: mira de nuevo la bandeja, marca leído, hace UNA
 * inferencia con todos los textos, confirma que nada llegó mientras tanto y entrega.
 */
export class ResponderLote {
  private readonly entregar: Entregar;

  constructor(private readonly deps: DepsResponderLote) {
    this.entregar = new Entregar(deps);
  }

  async ejecutar(lote: LoteEnCola): Promise<void> {
    const { cola, clientes, bandeja, canal } = this.deps;
    if (lote.tomas > MAXIMO_DE_TOMAS)
      return this.fallido(lote, "el lote no terminó tras 5 tomas");
    const cliente = await clientes.porTelefono(lote.contacto);
    const conversacion = cliente && (await bandeja.obtenerActiva(cliente.id));
    if (!cliente || conversacion?.estado !== "abierta")
      return cola.cerrar(lote.id, "descartado");
    const ultimo = lote.mensajes.at(-1)!;
    await canal
      .marcarLeido(ultimo.id, { escribiendo: true })
      .catch(() => undefined);
    const texto = lote.mensajes
      .flatMap((m) => (m.texto ? [m.texto] : []))
      .join("\n");
    if (
      !texto &&
      conversacion.motivoHandoff === MOTIVO_RECLAMO &&
      lote.mensajes.some((m) => m.tipo === "image")
    )
      await bandeja.registrarReclamo(conversacion.id, { imagenes: 1 });
    // La versión es parte de la clave: un lote re-procesado con más mensajes vuelve a inferir.
    const entrada: EntradaDelTurno = {
      loteId: `${lote.id}:v${lote.version}`,
      conversacionId: conversacion.id,
      cliente,
      texto,
      ultimoMensajeId: ultimo.id,
    };
    const resultado: ResultadoDelTurno = texto
      ? await this.deps.turno.atender(entrada)
      : { texto: acuseDelLote(lote), inferencias: 0 };
    if (!(await cola.confirmarEnvio(lote.id, lote.version))) return;
    const entregado = await this.entregar.ejecutar(
      conversacion,
      cliente,
      resultado,
    );
    if (entregado) {
      if (texto) await this.deps.turno.confirmar(entrada);
      return cola.cerrar(lote.id, "entregado");
    }
    return this.fallido(
      lote,
      "WhatsApp no aceptó la respuesta tras los reintentos",
    );
  }

  private async fallido(lote: LoteEnCola, error: string): Promise<void> {
    for (const m of lote.mensajes)
      await this.deps.entrantes.cartaMuerta({
        mensajeId: m.id,
        datos: m,
        error,
      });
    await this.deps.cola.cerrar(lote.id, "fallido");
  }
}
