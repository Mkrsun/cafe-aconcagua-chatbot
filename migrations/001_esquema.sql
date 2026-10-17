-- Todo lo del chatbot vive en su propio esquema.
CREATE SCHEMA IF NOT EXISTS cafe;

-- Las tablas de historia (cambios de consentimiento, versiones de pedidos) no se reescriben.
CREATE OR REPLACE FUNCTION cafe.rechazar_cambios_de_historia()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'la historia de % no se modifica', TG_TABLE_NAME;
END;
$$;
