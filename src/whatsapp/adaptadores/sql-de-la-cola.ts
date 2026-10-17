/** SQL de `ColaPostgres` (tablas de la espera humana): aparte del adaptador. */
const LOTES = "cafe.lotes_entrantes";
const MENSAJES = "cafe.mensajes_entrantes";

const COLUMNAS_DEL_LOTE =
  "id, contacto, abierto_en, ultimo_mensaje_en, ultima_clase, escritura_en, version, " +
  "reprocesos, tomas";

export const SQL = {
  /** Serializa todo lo de un contacto en la transacción; la tabla separa estos locks de otros. */
  bloquearContacto:
    "SELECT pg_advisory_xact_lock(hashtext('cafe.lotes_entrantes'), hashtext($1))",
  existeMensaje: `SELECT 1 FROM ${MENSAJES} WHERE mensaje_id = $1`,
  /** El abierto primero; si no, el que se genera y aún puede re-procesarse una vez. */
  loteParaSumar: `
    SELECT ${COLUMNAS_DEL_LOTE} FROM ${LOTES}
    WHERE contacto = $1
      AND (estado = 'abierto' OR (estado = 'generando' AND reprocesos = 0))
    ORDER BY (estado = 'abierto') DESC
    LIMIT 1
    FOR UPDATE`,
  abrirLote: `
    INSERT INTO ${LOTES} (id, contacto, estado, abierto_en, ultimo_mensaje_en, ultima_clase,
      vence_en)
    VALUES ($1, $2, 'abierto', $3, $3, 'normal', $3)`,
  sumarMensaje: `
    UPDATE ${LOTES}
    SET ultimo_mensaje_en = $2, ultima_clase = $3, vence_en = $4, version = version + 1
    WHERE id = $1`,
  guardarMensaje: `
    INSERT INTO ${MENSAJES} (mensaje_id, lote_id, recibido_en, datos)
    VALUES ($1, $2, $3, $4)`,
  /**
   * Los vencidos (o con el lease vencido), salvo que el mismo contacto tenga otro en curso
   * (aunque su lease venció: ese se retoma primero, solo). SKIP LOCKED: lo que otra réplica
   * está tomando en este instante no se espera ni se repite.
   */
  tomarVencidos: `
    WITH candidatos AS (
      SELECT l.id FROM ${LOTES} l
      WHERE ((l.estado = 'abierto' AND l.vence_en <= $1)
          OR (l.estado IN ('generando', 'enviando') AND l.tomado_hasta <= $1))
        AND NOT EXISTS (
          SELECT 1 FROM ${LOTES} o
          WHERE o.contacto = l.contacto
            AND o.id <> l.id AND o.estado IN ('generando', 'enviando'))
      ORDER BY l.vence_en
      LIMIT $3
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${LOTES} l
    SET estado = 'generando', tomado_hasta = $2, tomas = l.tomas + 1
    FROM candidatos c
    WHERE l.id = c.id
    RETURNING l.id, l.contacto, l.version, l.reprocesos, l.tomas, l.vence_en`,
  mensajesDe: `
    SELECT lote_id, mensaje_id, recibido_en, datos FROM ${MENSAJES}
    WHERE lote_id = ANY($1::text[])
    ORDER BY orden`,
  pasarAEnviar: `
    UPDATE ${LOTES} SET estado = 'enviando'
    WHERE id = $1 AND estado = 'generando' AND version = $2`,
  volverAEsperar: `
    UPDATE ${LOTES} SET estado = 'abierto', reprocesos = reprocesos + 1, tomado_hasta = NULL
    WHERE id = $1 AND estado = 'generando'`,
  cerrar: `
    UPDATE ${LOTES} SET estado = $2, tomado_hasta = NULL, cerrado_en = now()
    WHERE id = $1`,
} as const;
