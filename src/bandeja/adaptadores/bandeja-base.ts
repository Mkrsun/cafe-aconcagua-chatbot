import { NoEncontrado } from "../../plataforma/errores.js";
import type { ContenidoInteractivo } from "../../whatsapp/dominio/interactivos/contenido.js";
import type {
  ConversacionBandeja,
  EstadoDeConversacion,
  RegistroDeReclamo,
} from "../dominio/conversacion.js";
import {
  asignada,
  conMensaje,
  conReclamo,
  nuevoMensaje,
  pausada,
  reanudada,
  resuelta,
  type Transicion,
} from "../dominio/transiciones.js";
import type { IBandeja, MensajeDelCliente } from "../puertos/bandeja.js";

/**
 * Lo común de las dos bandejas: cada operación es una transición pura del dominio. Cada adaptador
 * solo sabe leer, abrir y aplicar una transición de forma atómica.
 */
export abstract class BandejaConTransiciones implements IBandeja {
  abstract obtener(id: string): Promise<ConversacionBandeja | undefined>;
  abstract obtenerActiva(
    clienteId: string,
  ): Promise<ConversacionBandeja | undefined>;
  abstract listar(
    estado?: EstadoDeConversacion,
  ): Promise<readonly ConversacionBandeja[]>;
  abstract registrarCliente(m: MensajeDelCliente): Promise<ConversacionBandeja>;
  /** Aplica la transición de forma atómica; `undefined` si la conversación no existe. */
  protected abstract actualizar(
    id: string,
    t: Transicion,
  ): Promise<ConversacionBandeja | undefined>;

  async registrarChatbot(
    id: string,
    texto: string,
    ahora: Date,
    interactivo?: ContenidoInteractivo,
  ) {
    const m = nuevoMensaje(
      { autor: "chatbot", texto, ...(interactivo ? { interactivo } : {}) },
      ahora,
    );
    return this.exigir(id, await this.actualizar(id, conMensaje(m)));
  }

  async registrarHumano(id: string, texto: string, autor: string, ahora: Date) {
    const m = nuevoMensaje(
      { autor: "humano", texto, autorNombre: autor },
      ahora,
    );
    return this.exigir(id, await this.actualizar(id, conMensaje(m)));
  }

  pausar(id: string, motivo: string, resumen?: string) {
    return this.actualizar(id, pausada(motivo, resumen, new Date()));
  }

  registrarReclamo(id: string, r: RegistroDeReclamo) {
    return this.actualizar(id, conReclamo(r, new Date()));
  }

  asignar(id: string, quien: string) {
    return this.actualizar(id, asignada(quien, new Date()));
  }

  reanudar(id: string) {
    return this.actualizar(id, reanudada(new Date()));
  }

  resolver(id: string) {
    return this.actualizar(id, resuelta(new Date()));
  }

  private exigir(id: string, c: ConversacionBandeja | undefined) {
    if (!c) throw new NoEncontrado(`la conversación ${id}`);
    return c;
  }
}

/** Una conversación nueva con el primer mensaje del cliente. */
export const conversacionNueva = (
  id: string,
  m: MensajeDelCliente,
): ConversacionBandeja => {
  const en = m.ahora.toISOString();
  const primero = nuevoMensaje(
    {
      autor: "cliente",
      texto: m.texto,
      ...(m.entrante ? { entrante: m.entrante } : {}),
    },
    m.ahora,
  );
  return {
    id,
    clienteId: m.clienteId,
    canal: "whatsapp",
    telefono: m.telefono,
    estado: "abierta",
    prioridad: "normal",
    mensajes: [primero],
    creadaEn: en,
    actualizadaEn: en,
  };
};

/** El mensaje del cliente sumado a su conversación activa. */
export const conMensajeDelCliente = (m: MensajeDelCliente): Transicion =>
  conMensaje(
    nuevoMensaje(
      {
        autor: "cliente",
        texto: m.texto,
        ...(m.entrante ? { entrante: m.entrante } : {}),
      },
      m.ahora,
    ),
  );
