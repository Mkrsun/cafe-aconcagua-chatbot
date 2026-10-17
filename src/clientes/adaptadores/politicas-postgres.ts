import { randomUUID } from "node:crypto";
import type pg from "pg";
import { enTransaccion } from "../../plataforma/postgres/transaccion.js";
import {
  POLITICA_POR_DEFECTO,
  type CambioDePolitica,
  type Consentimiento,
  type PoliticaDeContacto,
} from "../dominio/politica.js";
import type { IPoliticasDeContacto } from "../puertos/clientes.js";

interface Fila {
  consentimiento: Consentimiento;
  consentimiento_whatsapp: Consentimiento | null;
  fuente: string;
  min_dias_entre_contactos: number;
  ventana_desde: string;
  ventana_hasta: string;
  zona_horaria: string;
  actualizada_por: string;
  actualizada_en: Date;
}

const desdeFila = (f: Fila): PoliticaDeContacto => ({
  consentimiento: f.consentimiento,
  ...(f.consentimiento_whatsapp ? { whatsapp: f.consentimiento_whatsapp } : {}),
  fuente: f.fuente,
  minDiasEntreContactos: f.min_dias_entre_contactos,
  ventana: {
    desde: f.ventana_desde.slice(0, 5),
    hasta: f.ventana_hasta.slice(0, 5),
  },
  zonaHoraria: f.zona_horaria,
  actualizadaPor: f.actualizada_por,
  actualizadaEn: f.actualizada_en.toISOString(),
});

const GUARDAR = `
  INSERT INTO cafe.politicas_de_contacto (cliente_id, consentimiento, consentimiento_whatsapp,
    fuente, min_dias_entre_contactos, ventana_desde, ventana_hasta, zona_horaria,
    actualizada_por, actualizada_en)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (cliente_id) DO UPDATE SET consentimiento = EXCLUDED.consentimiento,
    consentimiento_whatsapp = EXCLUDED.consentimiento_whatsapp, fuente = EXCLUDED.fuente,
    min_dias_entre_contactos = EXCLUDED.min_dias_entre_contactos,
    ventana_desde = EXCLUDED.ventana_desde, ventana_hasta = EXCLUDED.ventana_hasta,
    zona_horaria = EXCLUDED.zona_horaria, actualizada_por = EXCLUDED.actualizada_por,
    actualizada_en = EXCLUDED.actualizada_en`;
// La hora en microsegundos de la base: dos cambios en el mismo milisegundo conservan su orden.
const CAMBIO = `
  INSERT INTO cafe.cambios_de_consentimiento
    (id, cliente_id, anterior, consentimiento, fuente, actor, creado_en)
  VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp())`;

/** Políticas en `cafe.politicas_de_contacto`, con su historia en `cambios_de_consentimiento`. */
export class PoliticasPostgres implements IPoliticasDeContacto {
  constructor(private readonly pool: pg.Pool) {}

  async de(clienteId: string) {
    const { rows } = await this.pool.query<Fila>(
      "SELECT * FROM cafe.politicas_de_contacto WHERE cliente_id = $1",
      [clienteId],
    );
    return rows[0] ? desdeFila(rows[0]) : POLITICA_POR_DEFECTO;
  }

  async guardar(clienteId: string, p: PoliticaDeContacto, actor: string) {
    const anterior = (await this.de(clienteId)).consentimiento;
    const en = new Date();
    await enTransaccion(this.pool, async (db) => {
      await db.query(GUARDAR, [
        clienteId,
        p.consentimiento,
        p.whatsapp ?? null,
        p.fuente,
        p.minDiasEntreContactos,
        p.ventana.desde,
        p.ventana.hasta,
        p.zonaHoraria,
        actor,
        en,
      ]);
      await db.query(CAMBIO, [
        randomUUID(),
        clienteId,
        anterior,
        p.consentimiento,
        p.fuente,
        actor,
      ]);
    });
  }

  async historial(clienteId: string): Promise<readonly CambioDePolitica[]> {
    const { rows } = await this.pool.query(
      `SELECT anterior, consentimiento, fuente, actor, creado_en
       FROM cafe.cambios_de_consentimiento
       WHERE cliente_id = $1 ORDER BY creado_en DESC`,
      [clienteId],
    );
    return rows.map((f) => ({
      anterior: f.anterior,
      consentimiento: f.consentimiento,
      fuente: f.fuente,
      actor: f.actor,
      en: (f.creado_en as Date).toISOString(),
    }));
  }
}
