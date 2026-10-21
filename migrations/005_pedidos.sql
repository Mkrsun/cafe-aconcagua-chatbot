-- Pedidos, sus versiones (inmutables) y sus pagos por Khipu. El detalle de cada uno, en JSON.
CREATE TABLE IF NOT EXISTS cafe.pedidos (
  id text PRIMARY KEY,
  cliente_id text NOT NULL,
  estado text NOT NULL,
  creado_en timestamptz NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  datos jsonb NOT NULL,
  CHECK (datos->>'id' = id)
);
CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON cafe.pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS pedidos_estado_idx ON cafe.pedidos (estado);

CREATE TABLE IF NOT EXISTS cafe.versiones_de_pedidos (
  id text PRIMARY KEY,
  pedido_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  creada_en timestamptz NOT NULL,
  datos jsonb NOT NULL,
  UNIQUE (pedido_id, version),
  CHECK (datos->>'id' = id)
);

DROP TRIGGER IF EXISTS versiones_de_pedidos_inmutables ON cafe.versiones_de_pedidos;
CREATE TRIGGER versiones_de_pedidos_inmutables
  BEFORE UPDATE OR DELETE ON cafe.versiones_de_pedidos
  FOR EACH ROW EXECUTE FUNCTION cafe.rechazar_cambios_de_historia();

CREATE TABLE IF NOT EXISTS cafe.pagos (
  id text PRIMARY KEY,
  pedido_id text NOT NULL,
  id_en_khipu text NOT NULL,
  estado text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  datos jsonb NOT NULL,
  CHECK (datos->>'id' = id)
);
CREATE INDEX IF NOT EXISTS pagos_pedido_idx ON cafe.pagos (pedido_id);
CREATE INDEX IF NOT EXISTS pagos_khipu_idx ON cafe.pagos (id_en_khipu);
