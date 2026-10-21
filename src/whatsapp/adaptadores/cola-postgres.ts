import { randomUUID } from "node:crypto";
import type pg from "pg";
import { enTransaccion } from "../../plataforma/postgres/transaccion.js";
import type { ClaseDeMensaje } from "../dominio/espera/clasificar.js";
import type {
  EstadoFinalDelLote,
  IColaDeEntrantes,
  LoteEnCola,
  MensajeEnCola,
  Vencer,
} from "../puertos/cola.js";
import { SQL } from "./sql-de-la-cola.js";

interface FilaDelLote {
  id: string;
  abierto_en: Date;
  ultimo_mensaje_en: Date;
  ultima_clase: ClaseDeMensaje;
}

interface FilaDelMensaje {
  lote_id: string;
  mensaje_id: string;
  recibido_en: Date;
  datos: Omit<MensajeEnCola, "id" | "recibidoEn">;
}

const estado = (f: FilaDelLote) => ({
  abiertoEn: f.abierto_en,
  ultimoMensajeEn: f.ultimo_mensaje_en,
  ultimaClase: f.ultima_clase,
});

/**
 * La cola en `cafe.lotes_entrantes` y `cafe.mensajes_entrantes`: lo de un contacto se serializa
 * con un advisory lock y los despachadores toman con `SKIP LOCKED` (varias réplicas).
 */
export class ColaPostgres implements IColaDeEntrantes {
  constructor(private readonly pool: pg.Pool) {}

  encolar(m: MensajeEnCola, clase: ClaseDeMensaje, vencer: Vencer) {
    return enTransaccion(this.pool, async (db) => {
      await db.query(SQL.bloquearContacto, [m.contacto]);
      if ((await db.query(SQL.existeMensaje, [m.id])).rowCount)
        return "duplicado" as const;
      const lote =
        (await db.query<FilaDelLote>(SQL.loteParaSumar, [m.contacto]))
          .rows[0] ?? (await this.abrir(db, m));
      const vence = vencer(
        estado({
          ...lote,
          ultimo_mensaje_en: m.recibidoEn,
          ultima_clase: clase,
        }),
      );
      await db.query(SQL.sumarMensaje, [lote.id, m.recibidoEn, clase, vence]);
      const { id, recibidoEn, ...datos } = m;
      await db.query(SQL.guardarMensaje, [id, lote.id, recibidoEn, datos]);
      return "encolado" as const;
    });
  }

  async tomarVencidos(
    ahora: Date,
    opciones: { leaseMs: number; limite: number },
  ) {
    const hasta = new Date(ahora.getTime() + opciones.leaseMs);
    const { rows } = await this.pool.query<Omit<LoteEnCola, "mensajes">>(
      SQL.tomarVencidos,
      [ahora, hasta, opciones.limite],
    );
    if (!rows.length) return [];
    const mensajes = await this.pool.query<FilaDelMensaje>(SQL.mensajesDe, [
      rows.map((r) => r.id),
    ]);
    return rows.map((r): LoteEnCola => ({
      id: r.id,
      contacto: r.contacto,
      version: r.version,
      reprocesos: r.reprocesos,
      tomas: r.tomas,
      mensajes: mensajes.rows
        .filter((m) => m.lote_id === r.id)
        .map((m) => ({
          ...m.datos,
          id: m.mensaje_id,
          recibidoEn: m.recibido_en,
        })),
    }));
  }

  async confirmarEnvio(loteId: string, version: number) {
    if ((await this.pool.query(SQL.pasarAEnviar, [loteId, version])).rowCount)
      return true;
    await this.pool.query(SQL.volverAEsperar, [loteId]);
    return false;
  }

  async cerrar(loteId: string, estadoFinal: EstadoFinalDelLote) {
    await this.pool.query(SQL.cerrar, [loteId, estadoFinal]);
  }

  private async abrir(
    db: pg.PoolClient,
    m: MensajeEnCola,
  ): Promise<FilaDelLote> {
    const id = randomUUID();
    await db.query(SQL.abrirLote, [id, m.contacto, m.recibidoEn]);
    return {
      id,
      abierto_en: m.recibidoEn,
      ultimo_mensaje_en: m.recibidoEn,
      ultima_clase: "normal",
    };
  }
}
