-- Consentimiento y política de contacto de cada cliente, con la historia de sus cambios.
CREATE TABLE IF NOT EXISTS cafe.politicas_de_contacto (
  cliente_id text PRIMARY KEY REFERENCES cafe.clientes (id) ON DELETE CASCADE,
  consentimiento text NOT NULL CHECK (consentimiento IN ('desconocido', 'otorgado', 'retirado')),
  consentimiento_whatsapp text
    CHECK (consentimiento_whatsapp IN ('desconocido', 'otorgado', 'retirado')),
  fuente text NOT NULL,
  min_dias_entre_contactos integer NOT NULL DEFAULT 7
    CHECK (min_dias_entre_contactos BETWEEN 1 AND 90),
  ventana_desde time NOT NULL DEFAULT '09:00',
  ventana_hasta time NOT NULL DEFAULT '18:00',
  zona_horaria text NOT NULL DEFAULT 'America/Santiago',
  actualizada_por text NOT NULL,
  actualizada_en timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS cafe.cambios_de_consentimiento (
  id text PRIMARY KEY,
  cliente_id text NOT NULL REFERENCES cafe.clientes (id),
  anterior text NOT NULL CHECK (anterior IN ('desconocido', 'otorgado', 'retirado')),
  consentimiento text NOT NULL CHECK (consentimiento IN ('desconocido', 'otorgado', 'retirado')),
  fuente text NOT NULL,
  actor text NOT NULL,
  creado_en timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS cambios_de_consentimiento_cliente_idx
  ON cafe.cambios_de_consentimiento (cliente_id, creado_en DESC);

DROP TRIGGER IF EXISTS cambios_de_consentimiento_inmutables ON cafe.cambios_de_consentimiento;
CREATE TRIGGER cambios_de_consentimiento_inmutables
  BEFORE UPDATE OR DELETE ON cafe.cambios_de_consentimiento
  FOR EACH ROW EXECUTE FUNCTION cafe.rechazar_cambios_de_historia();
