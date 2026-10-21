-- Clientes de Café: su ficha, su tramo de precios y sus teléfonos de WhatsApp.
CREATE TABLE IF NOT EXISTS cafe.clientes (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('mayorista-tienda', 'mayorista-local', 'minorista', 'horeca')),
  tramo text NOT NULL CHECK (tramo IN ('minorista', 'mayorista')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'perdido')),
  creado_en timestamptz NOT NULL,
  actualizado_en timestamptz NOT NULL
);

-- Un teléfono pertenece a un solo cliente (dígitos con código de país, sin el +).
CREATE TABLE IF NOT EXISTS cafe.telefonos_de_clientes (
  telefono text PRIMARY KEY,
  cliente_id text NOT NULL REFERENCES cafe.clientes (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS telefonos_de_clientes_cliente_idx
  ON cafe.telefonos_de_clientes (cliente_id);
