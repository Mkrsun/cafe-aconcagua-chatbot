import { randomUUID } from "node:crypto";
import type pg from "pg";
import { enTransaccion } from "../../plataforma/postgres/transaccion.js";
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

const POR_ID = `SELECT datos FROM cafe.conversaciones WHERE id = $1`;
const ACTIVA = `SELECT datos FROM cafe.conversaciones
  WHERE cliente_id = $1 AND estado <> 'resuelta'`;
const GUARDAR = `
  INSERT INTO cafe.conversaciones (id, cliente_id, estado, actualizada_en, datos)
  VALUES ($1, $2, $3, $4, $5::jsonb)
  ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado,
    actualizada_en = EXCLUDED.actualizada_en, datos = EXCLUDED.datos`;
/** La tabla como primera clave separa este lock de los de otras tablas con la misma clave. */
const BLOQUEAR_CLIENTE =
  "SELECT pg_advisory_xact_lock(hashtext('cafe.conversaciones'), hashtext($1))";

type Fila = { datos: ConversacionBandeja };

/** La bandeja en `cafe.conversaciones`: un documento JSON por conversación. */
export class BandejaPostgres extends BandejaConTransiciones {
  constructor(private readonly pool: pg.Pool) {
    super();
  }

  async obtener(id: string) {
    const { rows } = await this.pool.query<Fila>(POR_ID, [id]);
    return rows[0]?.datos;
  }

  async obtenerActiva(clienteId: string) {
    const { rows } = await this.pool.query<Fila>(ACTIVA, [clienteId]);
    return rows[0]?.datos;
  }

  async listar(estado?: EstadoDeConversacion) {
    const { rows } = await this.pool.query<Fila>(
      `SELECT datos FROM cafe.conversaciones
       WHERE $1::text IS NULL OR estado = $1
       ORDER BY actualizada_en DESC`,
      [estado ?? null],
    );
    return rows.map((r) => r.datos);
  }

  /** Bajo un advisory lock del cliente: dos mensajes simultáneos no abren dos conversaciones. */
  registrarCliente(m: MensajeDelCliente) {
    return enTransaccion(this.pool, async (db) => {
      await db.query(BLOQUEAR_CLIENTE, [m.clienteId]);
      const activa = (
        await db.query<Fila>(`${ACTIVA} FOR UPDATE`, [m.clienteId])
      ).rows[0]?.datos;
      const nueva = activa
        ? conMensajeDelCliente(m)(activa)
        : conversacionNueva(`conv_${randomUUID()}`, m);
      await guardar(db, nueva);
      return nueva;
    });
  }

  protected actualizar(id: string, t: Transicion) {
    return enTransaccion(this.pool, async (db) => {
      const { rows } = await db.query<Fila>(`${POR_ID} FOR UPDATE`, [id]);
      if (!rows[0]) return undefined;
      const nueva = t(rows[0].datos);
      await guardar(db, nueva);
      return nueva;
    });
  }
}

const guardar = (db: pg.PoolClient, c: ConversacionBandeja) =>
  db.query(GUARDAR, [
    c.id,
    c.clienteId,
    c.estado,
    c.actualizadaEn,
    JSON.stringify(c),
  ]);
