import type { ContenidoInteractivo } from "../../whatsapp/dominio/interactivos/contenido.js";
import type { ContenidoEntrante } from "../../whatsapp/dominio/interactivos/entrantes.js";
import type {
  ConversacionBandeja,
  EstadoDeConversacion,
  RegistroDeReclamo,
} from "../dominio/conversacion.js";

export interface MensajeDelCliente {
  readonly clienteId: string;
  readonly telefono: string;
  readonly texto: string;
  readonly entrante?: ContenidoEntrante;
  readonly ahora: Date;
}

/**
 * La bandeja de conversaciones (borde: PostgreSQL, `cafe.conversaciones`). Real:
 * `BandejaPostgres` · fake: `BandejaEnMemoria`. Una conversación activa por cliente.
 */
export interface IBandeja {
  obtener(id: string): Promise<ConversacionBandeja | undefined>;
  /** La no resuelta del cliente, si la hay. */
  obtenerActiva(clienteId: string): Promise<ConversacionBandeja | undefined>;
  /** La más reciente primero. */
  listar(
    estado?: EstadoDeConversacion,
  ): Promise<readonly ConversacionBandeja[]>;
  /** Suma el mensaje a la activa o abre una nueva. */
  registrarCliente(m: MensajeDelCliente): Promise<ConversacionBandeja>;
  registrarChatbot(
    id: string,
    texto: string,
    ahora: Date,
    interactivo?: ContenidoInteractivo,
  ): Promise<ConversacionBandeja>;
  /** Escribir desde la bandeja asigna la conversación a quien escribe. */
  registrarHumano(
    id: string,
    texto: string,
    autor: string,
    ahora: Date,
  ): Promise<ConversacionBandeja>;
  pausar(
    id: string,
    motivo: string,
    resumen?: string,
  ): Promise<ConversacionBandeja | undefined>;
  registrarReclamo(
    id: string,
    r: RegistroDeReclamo,
  ): Promise<ConversacionBandeja | undefined>;
  asignar(id: string, quien: string): Promise<ConversacionBandeja | undefined>;
  reanudar(id: string): Promise<ConversacionBandeja | undefined>;
  resolver(id: string): Promise<ConversacionBandeja | undefined>;
}
