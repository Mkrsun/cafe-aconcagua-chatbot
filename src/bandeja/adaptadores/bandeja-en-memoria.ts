import { randomUUID } from "node:crypto";
import type {
  ConversacionBandeja,
  EstadoDeConversacion,
} from "../dominio/conversacion.js";
import type { Transicion } from "../dominio/transiciones.js";
import type { MensajeDelCliente } from "../puertos/bandeja.js";
import {
  BandejaConTransiciones,
  conMensajeDelCliente,
  conversacionNueva,
} from "./bandeja-base.js";

/** La bandeja en memoria del proceso: desarrollo y pruebas. */
export class BandejaEnMemoria extends BandejaConTransiciones {
  private readonly conversaciones = new Map<string, ConversacionBandeja>();

  async obtener(id: string) {
    return this.conversaciones.get(id);
  }

  async obtenerActiva(clienteId: string) {
    return [...this.conversaciones.values()].find(
      (c) => c.clienteId === clienteId && c.estado !== "resuelta",
    );
  }

  async listar(estado?: EstadoDeConversacion) {
    return [...this.conversaciones.values()]
      .filter((c) => !estado || c.estado === estado)
      .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn));
  }

  async registrarCliente(m: MensajeDelCliente) {
    const activa = await this.obtenerActiva(m.clienteId);
    const nueva = activa
      ? conMensajeDelCliente(m)(activa)
      : conversacionNueva(`conv_${randomUUID()}`, m);
    this.conversaciones.set(nueva.id, nueva);
    return nueva;
  }

  protected async actualizar(id: string, t: Transicion) {
    const actual = this.conversaciones.get(id);
    if (!actual) return undefined;
    const nueva = t(actual);
    this.conversaciones.set(id, nueva);
    return nueva;
  }
}
