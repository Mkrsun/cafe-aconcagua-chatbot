-- Registros duraderos: documentos JSON por clave (estado del turno, gasto del mes, preguntas
-- frecuentes, ventana de 24 h), escritos bajo un advisory lock por clave.
CREATE TABLE IF NOT EXISTS cafe.registros (
  clave text PRIMARY KEY,
  datos jsonb NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
