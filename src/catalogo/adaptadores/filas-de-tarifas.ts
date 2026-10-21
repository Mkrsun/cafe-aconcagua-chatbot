import type pg from "pg";
import type {
  DatosDeTarifa,
  TarifaDeDespacho,
} from "../dominio/despacho/tarifa.js";

interface Fila {
  id: string;
  zona: string;
  comunas: string[];
  monto_clp: number;
  gratis_desde_clp: number | null;
  dias_desde: number;
  dias_hasta: number;
  activa: boolean;
  revision: number;
  actualizada_por: string;
  actualizada_en: Date;
}

const desdeFila = (f: Fila): TarifaDeDespacho => ({
  id: f.id,
  zona: f.zona,
  comunas: f.comunas,
  montoClp: f.monto_clp,
  ...(f.gratis_desde_clp === null
    ? {}
    : { gratisDesdeClp: f.gratis_desde_clp }),
  plazo: { desdeDias: f.dias_desde, hastaDias: f.dias_hasta },
  activa: f.activa,
  revision: f.revision,
  actualizadaPor: f.actualizada_por,
  actualizadaEn: f.actualizada_en.toISOString(),
});

const LISTAR = `SELECT * FROM cafe.zonas_de_despacho ORDER BY creada_en, id`;
const GUARDAR = `
  INSERT INTO cafe.zonas_de_despacho (id, zona, comunas, monto_clp, gratis_desde_clp,
    dias_desde, dias_hasta, activa, revision, actualizada_por, actualizada_en)
  VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, clock_timestamp())
  ON CONFLICT (id) DO UPDATE SET zona = EXCLUDED.zona, comunas = EXCLUDED.comunas,
    monto_clp = EXCLUDED.monto_clp, gratis_desde_clp = EXCLUDED.gratis_desde_clp,
    dias_desde = EXCLUDED.dias_desde, dias_hasta = EXCLUDED.dias_hasta,
    activa = EXCLUDED.activa, revision = EXCLUDED.revision,
    actualizada_por = EXCLUDED.actualizada_por, actualizada_en = EXCLUDED.actualizada_en
  RETURNING *`;
export const BORRAR = `DELETE FROM cafe.zonas_de_despacho WHERE id = $1`;

/** Todas las tarifas, en orden de creación. */
export const listarTarifas = async (
  db: pg.Pool | pg.PoolClient,
): Promise<TarifaDeDespacho[]> =>
  (await db.query<Fila>(LISTAR)).rows.map(desdeFila);

/** Inserta o reemplaza una tarifa con su nueva revisión y devuelve cómo quedó. */
export async function guardar(
  db: pg.PoolClient,
  id: string,
  d: DatosDeTarifa,
  revision: number,
  actor: string,
): Promise<TarifaDeDespacho> {
  const { rows } = await db.query<Fila>(GUARDAR, [
    id,
    d.zona,
    JSON.stringify(d.comunas),
    d.montoClp,
    d.gratisDesdeClp ?? null,
    d.plazo.desdeDias,
    d.plazo.hastaDias,
    d.activa,
    revision,
    actor,
  ]);
  return desdeFila(rows[0]!);
}
