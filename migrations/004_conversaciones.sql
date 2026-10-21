-- La bandeja: una conversación de WhatsApp por cliente a la vez, con su hilo en JSON.
CREATE TABLE IF NOT EXISTS cafe.conversaciones (
  id text PRIMARY KEY,
  cliente_id text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('abierta', 'pausada', 'asignada', 'resuelta')),
  actualizada_en timestamptz NOT NULL,
  datos jsonb NOT NULL,
  CHECK (datos->>'id' = id),
  CHECK (datos->>'clienteId' = cliente_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS conversaciones_activa_por_cliente_idx
  ON cafe.conversaciones (cliente_id)
  WHERE estado <> 'resuelta';
CREATE INDEX IF NOT EXISTS conversaciones_recientes_idx
  ON cafe.conversaciones (actualizada_en DESC);
