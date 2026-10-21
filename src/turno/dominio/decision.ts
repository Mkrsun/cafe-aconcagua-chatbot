const INTENCIONES = [
  "pedido",
  "informacion",
  "reclamo",
  "seguimiento",
] as const;
const ACCIONES = [
  "RESPONDER",
  "PREGUNTAR",
  "PROPONER",
  "CONFIRMAR",
  "DERIVAR",
] as const;
const FORMAS = ["texto", "botones", "lista", "ubicacion"] as const;

/** La decisión que entrega el modelo con la herramienta `decidir_turno`. */
export interface DecisionDelTurno {
  readonly intent: (typeof INTENCIONES)[number];
  readonly action: (typeof ACCIONES)[number];
  readonly changes: readonly {
    readonly sku: string;
    readonly cantidad: number;
  }[];
  readonly knownRefs: readonly string[];
  readonly faltantes: readonly string[];
  /** La comuna o zona de despacho tal como la dijo el cliente, o vacío. */
  readonly despacho: string;
  readonly forma: {
    readonly tipo: (typeof FORMAS)[number];
    readonly opciones: readonly string[];
    readonly skus: readonly string[];
  };
  readonly response: string;
  /** Hechos del cliente que sirven en otra conversación (su método, su local); vacío si nada. */
  readonly recordar: readonly string[];
}

export const HERRAMIENTA = {
  nombre: "decidir_turno",
  descripcion:
    "Entrega la decisión del asistente para este turno: intención, acción, cambios del pedido, " +
    "referencias, la forma y la respuesta redactada para el cliente.",
} as const;

const textos = { type: "array", items: { type: "string" } };

/** JSON Schema estricto: todos los campos presentes (vacíos si no aplican). */
export const ESQUEMA_DE_DECISION = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "action",
    "changes",
    "knownRefs",
    "faltantes",
    "despacho",
    "forma",
    "response",
    "recordar",
  ],
  properties: {
    intent: { type: "string", enum: INTENCIONES },
    action: { type: "string", enum: ACCIONES },
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sku", "cantidad"],
        properties: {
          sku: { type: "string" },
          cantidad: { type: "integer", minimum: 0 },
        },
      },
    },
    knownRefs: textos,
    faltantes: textos,
    despacho: { type: "string" },
    forma: {
      type: "object",
      additionalProperties: false,
      required: ["tipo", "opciones", "skus"],
      properties: {
        tipo: { type: "string", enum: FORMAS },
        opciones: textos,
        skus: textos,
      },
    },
    response: { type: "string" },
    recordar: textos,
  },
} as const;

const listaDeTextos = (v: unknown) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/** Lee la decisión del modelo; una que no cumple el esquema es un error (se repara una vez). */
export function leerDecision(valor: unknown): DecisionDelTurno {
  const d = (valor ?? {}) as Record<string, unknown>;
  const forma = (d.forma ?? {}) as Record<string, unknown>;
  const cambiosValidos =
    Array.isArray(d.changes) &&
    d.changes.length <= 50 &&
    d.changes.every(
      (c: { sku?: unknown; cantidad?: unknown }) =>
        typeof c?.sku === "string" &&
        Number.isSafeInteger(c.cantidad) &&
        (c.cantidad as number) >= 0,
    );
  const valida =
    INTENCIONES.includes(d.intent as never) &&
    ACCIONES.includes(d.action as never) &&
    FORMAS.includes(forma.tipo as never) &&
    typeof d.response === "string" &&
    typeof d.despacho === "string" &&
    cambiosValidos &&
    [d.knownRefs, d.faltantes, forma.opciones, forma.skus].every(
      listaDeTextos,
    ) &&
    (d.recordar === undefined || listaDeTextos(d.recordar));
  if (!valida)
    throw new Error("decisión inválida: no cumple el esquema de decidir_turno");
  // Un doble o un proveedor sin el campo nuevo no recuerda nada, pero decide igual.
  return { ...d, recordar: d.recordar ?? [] } as unknown as DecisionDelTurno;
}
