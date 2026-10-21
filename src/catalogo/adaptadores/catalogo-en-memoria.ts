import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import {
  exigirRevision,
  type EventoDeAuditoria,
} from "../dominio/auditoria.js";
import {
  formatoEditable,
  montosDe,
  precioEditable,
  type FormatoEditable,
} from "../dominio/formato.js";
import type { Tramo } from "../dominio/tramos.js";
import type {
  CambiosDeFormato,
  FormatoNuevo,
} from "../dominio/validar-formato.js";
import type { ICatalogoEditable } from "../puertos/catalogo.js";

/** El catálogo en memoria del proceso: desarrollo y pruebas. */
export class CatalogoEnMemoria implements ICatalogoEditable {
  private readonly vigentes = new Map<string, FormatoEditable>();
  private readonly archivados = new Map<string, FormatoEditable>();
  private readonly eventos: EventoDeAuditoria[] = [];

  constructor(formatos: readonly FormatoEditable[] = []) {
    for (const f of formatos) this.vigentes.set(f.sku, f);
  }

  async listar() {
    return [...this.vigentes.values()];
  }

  async crear(nuevo: FormatoNuevo, actor: string) {
    if (this.vigentes.has(nuevo.sku)) throw new Conflicto("sku-existe");
    const archivado = this.archivados.get(nuevo.sku);
    const formato = formatoEditable(nuevo, {});
    this.archivados.delete(nuevo.sku);
    this.vigentes.set(nuevo.sku, formato);
    const accion = archivado ? "formato.restaurado" : "formato.creado";
    this.anotar(accion, "formato", nuevo.sku, actor, archivado, formato);
    return formato;
  }

  async actualizar(
    sku: string,
    cambios: CambiosDeFormato,
    revision: unknown,
    actor: string,
  ) {
    const actual = this.exigir(sku);
    exigirRevision(actual, actual.revision, revision);
    const nuevo = formatoEditable({ ...actual, ...cambios }, montosDe(actual));
    this.vigentes.set(sku, nuevo);
    this.anotar("formato.actualizado", "formato", sku, actor, actual, nuevo);
    return nuevo;
  }

  async archivar(sku: string, revision: unknown, actor: string) {
    const actual = this.exigir(sku);
    exigirRevision(actual, actual.revision, revision);
    this.vigentes.delete(sku);
    this.archivados.set(sku, actual);
    this.anotar("formato.archivado", "formato", sku, actor, actual);
  }

  async fijarPrecio(
    sku: string,
    tramo: Tramo,
    monto: number | null,
    revision: unknown,
    actor: string,
  ) {
    const actual = this.exigir(sku);
    const previo = actual.precios.find((p) => p.tramo === tramo)!;
    exigirRevision(previo, previo.revision, revision);
    const montos = { ...montosDe(actual), [tramo]: monto };
    this.vigentes.set(sku, formatoEditable(actual, montos));
    const nuevo = precioEditable(sku, tramo, monto);
    const id = `${sku}:${tramo}`;
    this.anotar("precio.cambiado", "precio", id, actor, previo, nuevo);
    return nuevo;
  }

  async auditoria() {
    return [...this.eventos].reverse();
  }

  private exigir(sku: string): FormatoEditable {
    const actual = this.vigentes.get(sku);
    if (!actual) throw new NoEncontrado(`el formato ${sku}`);
    return actual;
  }

  private anotar(
    accion: string,
    entidad: EventoDeAuditoria["entidad"],
    entidadId: string,
    actor: string,
    antes?: unknown,
    despues?: unknown,
  ) {
    const en = new Date().toISOString();
    this.eventos.push({
      accion,
      entidad,
      entidadId,
      actor,
      ...(antes === undefined ? {} : { antes }),
      ...(despues === undefined ? {} : { despues }),
      en,
    });
  }
}
