-- Catálogo de Café: familias (el café), formatos (SKU) y el precio de cada tramo. Lo carga
-- `pnpm cargar` desde `definiciones/`; un precio sin monto está pendiente.
CREATE TABLE IF NOT EXISTS cafe.familias (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  actualizada_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cafe.formatos (
  sku text PRIMARY KEY,
  familia_id text NOT NULL REFERENCES cafe.familias (id),
  nombre text NOT NULL,
  gramaje text,
  disponible boolean NOT NULL DEFAULT true,
  archivado_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS formatos_vigentes_idx ON cafe.formatos (familia_id)
  WHERE archivado_en IS NULL;

CREATE TABLE IF NOT EXISTS cafe.precios (
  sku text NOT NULL REFERENCES cafe.formatos (sku),
  tramo text NOT NULL CHECK (tramo IN ('minorista', 'mayorista')),
  monto_clp integer CHECK (monto_clp IS NULL OR monto_clp > 0),
  actualizado_por text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, tramo)
);

-- Zonas de despacho: comunas, costo, desde qué total es gratis y plazo en días hábiles.
CREATE TABLE IF NOT EXISTS cafe.zonas_de_despacho (
  id text PRIMARY KEY,
  zona text NOT NULL UNIQUE,
  comunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  monto_clp integer NOT NULL CHECK (monto_clp >= 0),
  gratis_desde_clp integer CHECK (gratis_desde_clp IS NULL OR gratis_desde_clp > 0),
  dias_desde integer NOT NULL CHECK (dias_desde >= 0),
  dias_hasta integer NOT NULL CHECK (dias_hasta >= dias_desde),
  activa boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1,
  actualizada_por text NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  actualizada_en timestamptz NOT NULL DEFAULT now()
);

-- Quién cambió qué del catálogo y del despacho, con el antes y el después.
CREATE TABLE IF NOT EXISTS cafe.auditoria (
  id text PRIMARY KEY,
  actor text NOT NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id text NOT NULL,
  antes jsonb,
  despues jsonb,
  ocurrio_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_entidad_idx
  ON cafe.auditoria (entidad, entidad_id, ocurrio_en DESC);
