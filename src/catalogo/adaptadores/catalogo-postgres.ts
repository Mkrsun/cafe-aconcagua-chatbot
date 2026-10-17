import type pg from "pg";
import { Conflicto } from "../../plataforma/errores.js";
import {
  bloquear,
  enTransaccion,
} from "../../plataforma/postgres/transaccion.js";
import { exigirRevision } from "../dominio/auditoria.js";
import { precioEditable } from "../dominio/formato.js";
import { TRAMOS, type Tramo } from "../dominio/tramos.js";
import type {
  CambiosDeFormato,
  FormatoNuevo,
} from "../dominio/validar-formato.js";
import type { ICatalogoEditable } from "../puertos/catalogo.js";
import { auditar, leerAuditoria } from "./auditoria-postgres.js";
import {
  buscarFormato,
  leerFormato,
  listarFormatos,
} from "./filas-del-catalogo.js";
import { SQL } from "./sql-del-catalogo.js";

/** El catálogo en el esquema `cafe`; cada escritura en una transacción con su auditoría. */
export class CatalogoPostgres implements ICatalogoEditable {
  constructor(private readonly pool: pg.Pool) {}

  async listar() {
    return listarFormatos(this.pool);
  }

  crear(nuevo: FormatoNuevo, actor: string) {
    return this.escribir(async (db) => {
      const existente = await buscarFormato(db, nuevo.sku);
      if (existente && !existente.archivado) throw new Conflicto("sku-existe");
      const antes = existente?.formato;
      await db.query(SQL.crearFamilia, [nuevo.familia, nuevo.familiaNombre]);
      await db.query(antes ? SQL.restaurarFormato : SQL.crearFormato, [
        nuevo.sku,
        nuevo.familia,
        nuevo.nombre,
        nuevo.gramaje ?? null,
        nuevo.disponible,
      ]);
      // Lo que vuelve no arrastra precios viejos: quien lo trae fija los de hoy.
      for (const tramo of TRAMOS)
        await db.query(SQL.fijarPrecio, [nuevo.sku, tramo, null, actor]);
      const formato = await leerFormato(db, nuevo.sku);
      await auditar(db, {
        accion: antes ? "formato.restaurado" : "formato.creado",
        entidad: "formato",
        entidadId: nuevo.sku,
        actor,
        ...(antes ? { antes } : {}),
        despues: formato,
      });
      return formato;
    });
  }

  actualizar(
    sku: string,
    cambios: CambiosDeFormato,
    rev: unknown,
    actor: string,
  ) {
    return this.escribir(async (db) => {
      const actual = await leerFormato(db, sku);
      exigirRevision(actual, actual.revision, rev);
      const f = { ...actual, ...cambios };
      await db.query(SQL.actualizarFormato, [
        sku,
        f.nombre,
        f.gramaje ?? null,
        f.disponible,
      ]);
      const nuevo = await leerFormato(db, sku);
      await auditar(db, {
        accion: "formato.actualizado",
        entidad: "formato",
        entidadId: sku,
        actor,
        antes: actual,
        despues: nuevo,
      });
      return nuevo;
    });
  }

  archivar(sku: string, rev: unknown, actor: string) {
    return this.escribir(async (db) => {
      const actual = await leerFormato(db, sku);
      exigirRevision(actual, actual.revision, rev);
      await db.query(SQL.archivar, [sku]);
      await auditar(db, {
        accion: "formato.archivado",
        entidad: "formato",
        entidadId: sku,
        actor,
        antes: actual,
      });
    });
  }

  fijarPrecio(
    sku: string,
    tramo: Tramo,
    monto: number | null,
    rev: unknown,
    actor: string,
  ) {
    return this.escribir(async (db) => {
      const actual = await leerFormato(db, sku);
      const previo = actual.precios.find((p) => p.tramo === tramo)!;
      exigirRevision(previo, previo.revision, rev);
      await db.query(SQL.fijarPrecio, [sku, tramo, monto, actor]);
      const nuevo = precioEditable(sku, tramo, monto);
      await auditar(db, {
        accion: "precio.cambiado",
        entidad: "precio",
        entidadId: `${sku}:${tramo}`,
        actor,
        antes: previo,
        despues: nuevo,
      });
      return nuevo;
    });
  }

  auditoria() {
    return leerAuditoria(this.pool, ["formato", "precio"]);
  }

  private escribir<R>(trabajo: (db: pg.PoolClient) => Promise<R>): Promise<R> {
    return enTransaccion(this.pool, async (db) => {
      await bloquear(db, "cafe:catalogo");
      return trabajo(db);
    });
  }
}
