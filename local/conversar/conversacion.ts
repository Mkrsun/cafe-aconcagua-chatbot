import type { MensajeEnviado } from "../../e2e/dobles/graph.js";
import type { ClienteDeEjemplo } from "../clientes-de-ejemplo.js";
import { EQUIPO_DE_EJEMPLO } from "../entorno-de-desarrollo.js";
import type { ChatbotLocal } from "./chatbot-local.js";
import { interpretarLinea, type Orden } from "./interpretar.js";
import { mostrarMensaje, type OpcionElegible } from "./mostrar.js";
import { AVISOS, AYUDA } from "./textos.js";
import {
  mensajeDeEleccion,
  mensajeDeTexto,
  mensajeDeUbicacion,
  type MensajeDeMeta,
} from "./webhook.js";

/**
 * Una conversación de la CLI: manda cada línea sin esperar respuesta (la espera
 * humana es del chatbot) y muestra lo que llega, con las opciones del último interactivo.
 */
export class Conversacion {
  private opciones: OpcionElegible[] = [];
  private vistos = 0;
  /** El último mensaje del cliente que todavía no tiene respuesta. */
  private sinRespuesta?: string;
  private aviso?: keyof typeof AVISOS;

  constructor(
    private readonly chatbot: ChatbotLocal,
    private readonly cliente: ClienteDeEjemplo,
    private readonly escribir: (linea: string) => void,
  ) {}

  /** Lo que ya estaba en el doble no se repite. */
  async empezar() {
    this.vistos = (await this.chatbot.enviados()).length;
  }

  /** Atiende una línea; `false` si la persona pidió salir. */
  async atender(linea: string): Promise<boolean> {
    const orden = interpretarLinea(linea, this.opciones);
    if (orden.tipo === "salir") return false;
    if (orden.tipo === "ayuda") AYUDA.forEach((l) => this.escribir(l));
    if (orden.tipo === "pagar") await this.pagar();
    const mensaje = this.mensajeDe(orden);
    if (mensaje) await this.mandar(mensaje);
    return true;
  }

  /** Lo nuevo de los dobles: primero el «escribiendo», después las respuestas. */
  async revisar() {
    if (this.sinRespuesta && this.aviso !== "escribiendo") {
      const leidos = await this.chatbot.leidos();
      if (
        leidos.some((v) => v.mensajeId === this.sinRespuesta && v.escribiendo)
      )
        this.avisar("escribiendo");
    }
    const nuevos = (await this.chatbot.enviados()).slice(this.vistos);
    this.vistos += nuevos.length;
    nuevos.forEach((m) => this.mostrar(m));
  }

  private mensajeDe(orden: Orden): MensajeDeMeta | undefined {
    const { telefono } = this.cliente;
    if (orden.tipo === "texto") return mensajeDeTexto(telefono, orden.texto);
    if (orden.tipo === "eleccion") {
      this.escribir(`(Elegiste «${orden.opcion.titulo}»)`);
      return mensajeDeEleccion(telefono, orden.opcion);
    }
    if (orden.tipo === "ubicacion") {
      this.escribir("(Compartiste la ubicación de ejemplo: Plaza Ñuñoa)");
      return mensajeDeUbicacion(telefono);
    }
    return undefined;
  }

  private async mandar(mensaje: MensajeDeMeta) {
    await this.chatbot.enviar(mensaje);
    this.sinRespuesta = mensaje.id;
    if (!this.aviso) this.avisar("espera");
  }

  private async pagar() {
    const id = await this.chatbot.pagarUltimo();
    this.escribir(
      id
        ? `(Khipu confirmó el pago ${id})`
        : "(No hay ningún cobro pendiente: primero confirma un pedido.)",
    );
  }

  private mostrar(m: MensajeEnviado) {
    if (m.para === EQUIPO_DE_EJEMPLO)
      return mostrarMensaje(m, "Aviso al equipo").lineas.forEach(this.escribir);
    if (m.para !== this.cliente.telefono) return;
    const { lineas, opciones } = mostrarMensaje(m);
    lineas.forEach((l) => this.escribir(l));
    if (opciones.length) this.opciones = opciones;
    this.sinRespuesta = undefined;
    this.aviso = undefined;
  }

  private avisar(aviso: keyof typeof AVISOS) {
    this.aviso = aviso;
    this.escribir(AVISOS[aviso]);
  }
}
