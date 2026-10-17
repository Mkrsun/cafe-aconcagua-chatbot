import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { EventoDeAuditoria } from "../dominio/auditoria.js";
import { SQL } from "./sql-del-catalogo.js";

/** Deja un cambio en `cafe.auditoria`, dentro de la transacción de la escritura. */
export async function auditar(
  db: pg.PoolClient,
  evento: Omit<EventoDeAuditoria, "en">,
): Promise<void> {
  await db.query(SQL.auditar, [
    randomUUID(),
    evento.actor,
    evento.accion,
    evento.entidad,
    evento.entidadId,
    evento.antes === undefined ? null : JSON.stringify(evento.antes),
    evento.despues === undefined ? null : JSON.stringify(evento.despues),
  ]);
}

interface FilaDeAuditoria {
  accion: string;
  entidad: EventoDeAuditoria["entidad"];
  entidad_id: string;
  actor: string;
  antes: unknown;
  despues: unknown;
  ocurrio_en: Date;
}

/** Los últimos 50 cambios de esas entidades, el más nuevo primero. */
export async function leerAuditoria(
  pool: pg.Pool,
  entidades: readonly EventoDeAuditoria["entidad"][],
): Promise<readonly EventoDeAuditoria[]> {
  const { rows } = await pool.query<FilaDeAuditoria>(SQL.auditoria, [
    entidades,
  ]);
  return rows.map((f) => ({
    accion: f.accion,
    entidad: f.entidad,
    entidadId: f.entidad_id,
    actor: f.actor,
    ...(f.antes === null ? {} : { antes: f.antes }),
    ...(f.despues === null ? {} : { despues: f.despues }),
    en: f.ocurrio_en.toISOString(),
  }));
}
