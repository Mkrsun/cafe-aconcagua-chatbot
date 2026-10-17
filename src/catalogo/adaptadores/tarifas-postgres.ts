import { randomUUID } from "node:crypto";
import type pg from "pg";
import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import {
  bloquear,
  enTransaccion,
} from "../../plataforma/postgres/transaccion.js";
import { exigirRevision } from "../dominio/auditoria.js";
import {
  MAXIMO_DE_TARIFAS,
  type DatosDeTarifa,
  type TarifaDeDespacho,
} from "../dominio/despacho/tarifa.js";
import { BORRAR, guardar, listarTarifas } from "./filas-de-tarifas.js";
import { zonaRepetida } from "../dominio/despacho/zonas.js";
import type { ITarifasDeDespacho } from "../puertos/tarifas.js";
import { auditar, leerAuditoria } from "./auditoria-postgres.js";

/**
 * Tarifas en `cafe.zonas_de_despacho`. La unicidad de zonas y comunas se verifica dentro de la
 * transacción, bajo un advisory lock, con la misma regla de dominio que el fake.
 */
export class TarifasPostgres implements ITarifasDeDespacho {
  constructor(private readonly pool: pg.Pool) {}

  async listar() {
    return listarTarifas(this.pool);
  }

  crear(datos: DatosDeTarifa, actor: string) {
    return this.escribir(async (db, todas) => {
      if (todas.length >= MAXIMO_DE_TARIFAS)
        throw new Conflicto("tope-de-tarifas");
      exigirZonasLibres(todas, datos);
      const tarifa = await guardar(db, `DES-${randomUUID()}`, datos, 1, actor);
      await auditar(db, {
        accion: "zona.creada",
        entidad: "zona",
        entidadId: tarifa.id,
        actor,
        despues: tarifa,
      });
      return tarifa;
    });
  }

  actualizar(id: string, datos: DatosDeTarifa, rev: unknown, actor: string) {
    return this.escribir(async (db, todas) => {
      const actual = exigir(todas, id);
      exigirRevision(actual, actual.revision, rev);
      exigirZonasLibres(todas, datos, id);
      const nueva = await guardar(db, id, datos, actual.revision + 1, actor);
      await auditar(db, {
        accion: "zona.actualizada",
        entidad: "zona",
        entidadId: id,
        actor,
        antes: actual,
        despues: nueva,
      });
      return nueva;
    });
  }

  eliminar(id: string, rev: unknown, actor: string) {
    return this.escribir(async (db, todas) => {
      const actual = exigir(todas, id);
      exigirRevision(actual, actual.revision, rev);
      await db.query(BORRAR, [id]);
      await auditar(db, {
        accion: "zona.eliminada",
        entidad: "zona",
        entidadId: id,
        actor,
        antes: actual,
      });
    });
  }

  auditoria() {
    return leerAuditoria(this.pool, ["zona"]);
  }

  private escribir<R>(
    trabajo: (
      db: pg.PoolClient,
      todas: readonly TarifaDeDespacho[],
    ) => Promise<R>,
  ): Promise<R> {
    return enTransaccion(this.pool, async (db) => {
      await bloquear(db, "cafe:despacho");
      return trabajo(db, await listarTarifas(db));
    });
  }
}

function exigir(todas: readonly TarifaDeDespacho[], id: string) {
  const tarifa = todas.find((t) => t.id === id);
  if (!tarifa) throw new NoEncontrado(`la tarifa ${id}`);
  return tarifa;
}

function exigirZonasLibres(
  todas: readonly TarifaDeDespacho[],
  datos: DatosDeTarifa,
  idPropio?: string,
) {
  const repetida = zonaRepetida(todas, datos, idPropio);
  if (repetida) throw new Conflicto("zona-repetida", { lugar: repetida });
}
