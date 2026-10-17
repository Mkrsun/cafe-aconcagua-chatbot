import { randomUUID } from "node:crypto";
import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import {
  exigirRevision,
  type EventoDeAuditoria,
} from "../dominio/auditoria.js";
import {
  MAXIMO_DE_TARIFAS,
  type DatosDeTarifa,
  type TarifaDeDespacho,
} from "../dominio/despacho/tarifa.js";
import { zonaRepetida } from "../dominio/despacho/zonas.js";
import type { ITarifasDeDespacho } from "../puertos/tarifas.js";

/** Las tarifas de despacho en memoria del proceso: desarrollo y pruebas. */
export class TarifasEnMemoria implements ITarifasDeDespacho {
  private tarifas: TarifaDeDespacho[] = [];
  private readonly eventos: EventoDeAuditoria[] = [];

  async listar() {
    return [...this.tarifas];
  }

  async crear(datos: DatosDeTarifa, actor: string) {
    if (this.tarifas.length >= MAXIMO_DE_TARIFAS)
      throw new Conflicto("tope-de-tarifas");
    this.exigirZonasLibres(datos);
    const tarifa = this.sellar(datos, `DES-${randomUUID()}`, 1, actor);
    this.tarifas.push(tarifa);
    this.anotar("zona.creada", tarifa.id, actor, undefined, tarifa);
    return tarifa;
  }

  async actualizar(
    id: string,
    datos: DatosDeTarifa,
    rev: unknown,
    actor: string,
  ) {
    const actual = this.exigir(id);
    exigirRevision(actual, actual.revision, rev);
    this.exigirZonasLibres(datos, id);
    const nueva = this.sellar(datos, id, actual.revision + 1, actor);
    this.tarifas = this.tarifas.map((t) => (t.id === id ? nueva : t));
    this.anotar("zona.actualizada", id, actor, actual, nueva);
    return nueva;
  }

  async eliminar(id: string, rev: unknown, actor: string) {
    const actual = this.exigir(id);
    exigirRevision(actual, actual.revision, rev);
    this.tarifas = this.tarifas.filter((t) => t.id !== id);
    this.anotar("zona.eliminada", id, actor, actual);
  }

  async auditoria() {
    return [...this.eventos].reverse();
  }

  private exigirZonasLibres(datos: DatosDeTarifa, idPropio?: string) {
    const repetida = zonaRepetida(this.tarifas, datos, idPropio);
    if (repetida) throw new Conflicto("zona-repetida", { lugar: repetida });
  }

  private exigir(id: string) {
    const tarifa = this.tarifas.find((t) => t.id === id);
    if (!tarifa) throw new NoEncontrado(`la tarifa ${id}`);
    return tarifa;
  }

  private sellar(
    datos: DatosDeTarifa,
    id: string,
    revision: number,
    actor: string,
  ): TarifaDeDespacho {
    const actualizadaEn = new Date().toISOString();
    return { ...datos, id, revision, actualizadaPor: actor, actualizadaEn };
  }

  private anotar(
    accion: string,
    entidadId: string,
    actor: string,
    antes?: unknown,
    despues?: unknown,
  ) {
    const en = new Date().toISOString();
    const entidad = "zona" as const;
    this.eventos.push({
      accion,
      entidad,
      entidadId,
      actor,
      antes,
      despues,
      en,
    });
  }
}
