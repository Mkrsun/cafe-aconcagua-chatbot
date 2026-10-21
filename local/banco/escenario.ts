/** Lo que se espera de un turno: cómo termina, visto desde el cliente y el equipo. */
export type Espera = "respuesta" | "resumen" | "pago" | "traspaso" | "reclamo";

/** Un turno del caso: lo que escribe el cliente (uno o más mensajes seguidos) y qué se espera. */
export interface PasoDelEscenario {
  readonly cliente: string | readonly string[];
  readonly espera?: Espera;
  /** Lo que la respuesta tiene que nombrar (por ejemplo la comuna o el horario). */
  readonly menciona?: readonly RegExp[];
  /** «resolver»: el equipo cierra la conversación antes y el cliente vuelve días después. */
  readonly antes?: "resolver";
}

/** Un caso del negocio: un cliente con su tramo y una conversación de uno o más turnos. */
export interface Escenario {
  readonly id: string;
  readonly descripcion: string;
  readonly cliente: {
    readonly nombre: string;
    readonly tipo:
      "minorista" | "mayorista-tienda" | "mayorista-local" | "horeca";
    readonly tramo: "minorista" | "mayorista";
  };
  readonly pasos: readonly PasoDelEscenario[];
}

/** Lo que pasó en un turno del banco: lo que leyó el cliente, el aviso al equipo y el gasto. */
export interface TurnoDelBanco {
  readonly cliente: readonly string[];
  readonly chatbot: readonly string[];
  readonly avisosAlEquipo: readonly string[];
  readonly llamadas: readonly LlamadaDelBanco[];
  /** Cómo terminó el turno, deducido de lo enviado (botones, enlace, aviso). */
  readonly termino: Espera;
}

export interface LlamadaDelBanco {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latenciaMs: number;
  readonly error?: string;
}

export interface ResultadoDelEscenario {
  readonly escenario: Escenario;
  readonly turnos: readonly TurnoDelBanco[];
  readonly fallos: readonly string[];
}
