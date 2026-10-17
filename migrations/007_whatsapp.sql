-- WhatsApp: cada mensaje de Meta se procesa una vez; lo que no se pudo procesar queda como carta
-- muerta para revisarlo.
CREATE TABLE IF NOT EXISTS cafe.mensajes_recibidos (
  mensaje_id text PRIMARY KEY,
  estado text NOT NULL CHECK (estado IN ('procesando', 'procesado')),
  reclamado_en timestamptz NOT NULL,
  procesado_en timestamptz
);

CREATE TABLE IF NOT EXISTS cafe.cartas_muertas (
  id bigserial PRIMARY KEY,
  mensaje_id text NOT NULL,
  datos jsonb NOT NULL,
  intentos integer NOT NULL CHECK (intentos > 0),
  ultimo_error text NOT NULL,
  creada_en timestamptz NOT NULL
);

-- Cola durable de la espera humana: un lote abierto por contacto, tomado con FOR UPDATE SKIP LOCKED.
CREATE TABLE IF NOT EXISTS cafe.lotes_entrantes (
  id text PRIMARY KEY,
  contacto text NOT NULL,
  estado text NOT NULL CHECK (
    estado IN ('abierto', 'generando', 'enviando', 'entregado', 'descartado', 'fallido')
  ),
  abierto_en timestamptz NOT NULL,
  ultimo_mensaje_en timestamptz NOT NULL,
  ultima_clase text NOT NULL CHECK (ultima_clase IN ('incompleto', 'normal', 'cierre')),
  escritura_en timestamptz,
  vence_en timestamptz NOT NULL,
  tomado_hasta timestamptz,
  version integer NOT NULL DEFAULT 0,
  reprocesos integer NOT NULL DEFAULT 0,
  tomas integer NOT NULL DEFAULT 0,
  cerrado_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS lotes_entrantes_abierto_idx
  ON cafe.lotes_entrantes (contacto)
  WHERE estado = 'abierto';
CREATE INDEX IF NOT EXISTS lotes_entrantes_pendientes_idx
  ON cafe.lotes_entrantes (vence_en)
  WHERE estado IN ('abierto', 'generando', 'enviando');

CREATE TABLE IF NOT EXISTS cafe.mensajes_entrantes (
  mensaje_id text PRIMARY KEY,
  lote_id text NOT NULL REFERENCES cafe.lotes_entrantes (id),
  orden bigint GENERATED ALWAYS AS IDENTITY,
  recibido_en timestamptz NOT NULL,
  datos jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS mensajes_entrantes_lote_idx
  ON cafe.mensajes_entrantes (lote_id, orden);
