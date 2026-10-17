import type { MensajeEnviado } from "../../e2e/dobles/graph.js";

/** Una opción de un botón o de una lista que el cliente elige escribiendo su número. */
export interface OpcionElegible {
  readonly origen: "boton" | "lista";
  readonly id: string;
  readonly titulo: string;
  readonly descripcion?: string;
}

export interface MensajeMostrado {
  readonly lineas: string[];
  /** Vacío si el mensaje no ofrece nada que elegir. */
  readonly opciones: OpcionElegible[];
}

const numeradas = (opciones: readonly OpcionElegible[]) =>
  opciones.map(
    (o, i) =>
      `  ${i + 1}) ${o.titulo}${o.descripcion ? ` · ${o.descripcion}` : ""}`,
  );

export function opcionesDe(m: MensajeEnviado): OpcionElegible[] {
  const accion = m.interactivo?.action;
  if (m.interactivo?.type === "button")
    return (accion?.buttons ?? []).map(({ reply }) => ({
      origen: "boton",
      id: reply.id,
      titulo: reply.title,
    }));
  if (m.interactivo?.type !== "list") return [];
  return (accion?.sections ?? [])
    .flatMap((s) => s.rows)
    .map((f) => ({
      origen: "lista",
      id: f.id,
      titulo: f.title,
      ...(f.description ? { descripcion: f.description } : {}),
    }));
}

function extra(m: MensajeEnviado): string[] {
  const tipo = m.interactivo?.type;
  const enlace = m.interactivo?.action?.parameters;
  if (tipo === "cta_url" && enlace)
    return [
      `  [${enlace.display_text}] ${enlace.url} (escribe /pagar para simular el pago)`,
    ];
  if (tipo === "location_request_message")
    return [
      "  [Enviar ubicación] (escribe /ubicacion para compartir una de ejemplo)",
    ];
  return [];
}

/** Lo que el chatbot mandó por WhatsApp, como texto de terminal con las opciones numeradas. */
export function mostrarMensaje(
  m: MensajeEnviado,
  quien = "Chatbot",
): MensajeMostrado {
  if (m.plantilla)
    return {
      lineas: [
        `${quien} (plantilla ${m.plantilla}): ${(m.parametros ?? []).join(" · ")}`,
      ],
      opciones: [],
    };
  const opciones = opcionesDe(m);
  return {
    lineas: [`${quien}: ${m.texto ?? ""}`, ...numeradas(opciones), ...extra(m)],
    opciones,
  };
}
