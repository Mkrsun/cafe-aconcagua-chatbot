import type pg from "pg";
import type { CartaMuerta, IEntrantes } from "../puertos/entrantes.js";

const RECIBIDOS = "cafe.mensajes_recibidos";
const CARTAS = "cafe.cartas_muertas";

/** El reclamo por id de Meta (`cafe.mensajes_recibidos`) y las cartas muertas. */
export class EntrantesPostgres implements IEntrantes {
  constructor(
    private readonly pool: pg.Pool,
    private readonly vencimientoMs = 300_000,
  ) {}

  async reclamar(mensajeId: string) {
    const r = await this.pool.query(
      `INSERT INTO ${RECIBIDOS} (mensaje_id, estado, reclamado_en)
       VALUES ($1, 'procesando', clock_timestamp())
       ON CONFLICT (mensaje_id) DO UPDATE SET reclamado_en = clock_timestamp()
       WHERE ${RECIBIDOS}.estado = 'procesando'
         AND ${RECIBIDOS}.reclamado_en
           <= clock_timestamp() - ($2::double precision * interval '1 ms')
       RETURNING 1`,
      [mensajeId, this.vencimientoMs],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async soltar(mensajeId: string) {
    await this.pool.query(
      `DELETE FROM ${RECIBIDOS} WHERE mensaje_id = $1 AND estado = 'procesando'`,
      [mensajeId],
    );
  }

  async marcarProcesado(mensajeId: string) {
    await this.pool.query(
      `UPDATE ${RECIBIDOS} SET estado = 'procesado', procesado_en = now()
       WHERE mensaje_id = $1`,
      [mensajeId],
    );
  }

  async cartaMuerta(carta: CartaMuerta) {
    await this.pool.query(
      `INSERT INTO ${CARTAS} (mensaje_id, datos, intentos, ultimo_error, creada_en)
       VALUES ($1, $2::jsonb, 1, $3, now())`,
      [carta.mensajeId, JSON.stringify(carta.datos ?? null), carta.error],
    );
  }

  async cartasMuertas() {
    const { rows } = await this.pool.query(
      `SELECT mensaje_id, datos, ultimo_error, creada_en FROM ${CARTAS}
       ORDER BY id DESC LIMIT 100`,
    );
    return rows.map((f) => ({
      mensajeId: f.mensaje_id as string,
      datos: f.datos as unknown,
      error: f.ultimo_error as string,
      en: (f.creada_en as Date).toISOString(),
    }));
  }
}
