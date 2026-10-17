/** SQL de `CatalogoPostgres` y de la auditoría (esquema `cafe`), aparte de los adaptadores. */
const FORMATOS = `
  SELECT f.sku, f.nombre, f.familia_id, fa.nombre AS familia_nombre, f.gramaje, f.disponible,
         f.archivado_en IS NOT NULL AS archivado,
         COALESCE(jsonb_object_agg(p.tramo, p.monto_clp)
           FILTER (WHERE p.monto_clp IS NOT NULL), '{}'::jsonb) AS montos
  FROM cafe.formatos f
  JOIN cafe.familias fa ON fa.id = f.familia_id
  LEFT JOIN cafe.precios p ON p.sku = f.sku`;

const AGRUPAR = `GROUP BY f.sku, fa.nombre`;

export const SQL = {
  listar: `${FORMATOS} WHERE f.archivado_en IS NULL ${AGRUPAR} ORDER BY f.creado_en, f.sku`,
  uno: `${FORMATOS} WHERE f.sku = $1 ${AGRUPAR}`,
  crearFamilia: `
    INSERT INTO cafe.familias (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
  crearFormato: `
    INSERT INTO cafe.formatos (sku, familia_id, nombre, gramaje, disponible)
    VALUES ($1, $2, $3, $4, $5)`,
  restaurarFormato: `
    UPDATE cafe.formatos
    SET familia_id = $2, nombre = $3, gramaje = $4, disponible = $5, archivado_en = NULL,
        actualizado_en = now()
    WHERE sku = $1`,
  actualizarFormato: `
    UPDATE cafe.formatos
    SET nombre = $2, gramaje = $3, disponible = $4, actualizado_en = now()
    WHERE sku = $1`,
  archivar: `
    UPDATE cafe.formatos SET archivado_en = now(), actualizado_en = now() WHERE sku = $1`,
  fijarPrecio: `
    INSERT INTO cafe.precios (sku, tramo, monto_clp, actualizado_por)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (sku, tramo) DO UPDATE SET
      monto_clp = EXCLUDED.monto_clp, actualizado_por = EXCLUDED.actualizado_por,
      actualizado_en = now()`,
  auditar: `
    INSERT INTO cafe.auditoria (id, actor, accion, entidad, entidad_id, antes, despues, ocurrio_en)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, clock_timestamp())`,
  auditoria: `
    SELECT accion, entidad, entidad_id, actor, antes, despues, ocurrio_en
    FROM cafe.auditoria
    WHERE entidad = ANY($1::text[])
    ORDER BY ocurrio_en DESC LIMIT 50`,
} as const;
