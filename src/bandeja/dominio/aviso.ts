/** Por qué se avisa al equipo. */
export type TipoDeAviso = "traspaso" | "reclamo" | "desconocido" | "gasto";

export interface Aviso {
  readonly tipo: TipoDeAviso;
  /** Quién es, en una línea (nombre y teléfono). */
  readonly cliente: string;
  readonly motivo: string;
  readonly resumen: string;
  /** El episodio: con él, un aviso por conversación cada 24 h. */
  readonly conversacionId?: string;
}

const ENCABEZADOS: Readonly<Record<TipoDeAviso, string>> = {
  traspaso: "Te paso un cliente: respóndele con pnpm bandeja.",
  reclamo: "Registré un reclamo (informativo: sigo atendiendo yo).",
  desconocido: "Escribió un número que no está en el CRM.",
  gasto: "Aviso del gasto mensual del modelo.",
};

/** El texto libre del aviso (dentro de la ventana, o el equivalente legible de la plantilla). */
export const textoDelAviso = (a: Aviso) =>
  [
    ENCABEZADOS[a.tipo],
    `Cliente: ${a.cliente}`,
    `Motivo: ${a.motivo}`,
    `Resumen: ${a.resumen}`,
  ].join("\n");
