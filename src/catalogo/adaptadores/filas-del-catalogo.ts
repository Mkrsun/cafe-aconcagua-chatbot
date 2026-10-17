import type pg from "pg";
import { NoEncontrado } from "../../plataforma/errores.js";
import { formatoEditable, type FormatoEditable } from "../dominio/formato.js";
import type { Tramo } from "../dominio/tramos.js";
import { SQL } from "./sql-del-catalogo.js";

interface Fila {
  sku: string;
  nombre: string;
  familia_id: string;
  familia_nombre: string;
  gramaje: string | null;
  disponible: boolean;
  archivado: boolean;
  montos: Partial<Record<Tramo, number>>;
}

const desdeFila = (f: Fila): FormatoEditable =>
  formatoEditable(
    {
      sku: f.sku,
      nombre: f.nombre,
      familia: f.familia_id,
      familiaNombre: f.familia_nombre,
      ...(f.gramaje ? { gramaje: f.gramaje } : {}),
      disponible: f.disponible,
    },
    f.montos,
  );

/** Los formatos vigentes, con sus precios por tramo. */
export const listarFormatos = async (db: pg.Pool) =>
  (await db.query<Fila>(SQL.listar)).rows.map(desdeFila);

/** Un formato, vigente o archivado; `undefined` si el SKU nunca existió. */
export async function buscarFormato(
  db: pg.Pool | pg.PoolClient,
  sku: string,
): Promise<{ formato: FormatoEditable; archivado: boolean } | undefined> {
  const fila = (await db.query<Fila>(SQL.uno, [sku])).rows[0];
  return fila && { formato: desdeFila(fila), archivado: fila.archivado };
}

/** Un formato vigente (dentro o fuera de una transacción); si no existe, `NoEncontrado`. */
export async function leerFormato(
  db: pg.Pool | pg.PoolClient,
  sku: string,
): Promise<FormatoEditable> {
  const encontrado = await buscarFormato(db, sku);
  if (!encontrado || encontrado.archivado)
    throw new NoEncontrado(`el formato ${sku}`);
  return encontrado.formato;
}
