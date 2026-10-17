import type { MensajeEnviado } from "../../e2e/dobles/graph.js";
import type { DepsDeLaBandeja } from "../../launcher/operacion/bandeja/comandos.js";
import type { GastoMensual } from "../../src/modelo/casos-de-uso/gasto-mensual.js";
import type { ChatbotLocal } from "../conversar/chatbot-local.js";
import { armarHilo, type MensajeDelCliente } from "./hilo.js";

export type Telefono = Pick<
  ChatbotLocal,
  "enviar" | "enviados" | "leidos" | "pagarUltimo"
>;

export interface FuentesDelEstado {
  readonly telefono: Telefono;
  readonly bandeja: DepsDeLaBandeja;
  readonly gasto: Pick<GastoMensual, "delMes">;
  /** El número del equipo: lo que le llega son los avisos. */
  readonly equipo: string;
}

/** Lo que el equipo ve de cada conversación abierta (las resueltas no se muestran). */
async function conversaciones({ bandeja, clientes }: DepsDeLaBandeja) {
  const abiertas = (await bandeja.listar()).filter(
    (c) => c.estado !== "resuelta",
  );
  return Promise.all(
    abiertas.map(async (c) => ({
      id: c.id,
      telefono: c.telefono ?? "",
      nombre: (await clientes.porId(c.clienteId))?.nombre ?? "Sin ficha",
      estado: c.estado,
      propietario: c.propietario ?? null,
      motivo: c.motivoHandoff ?? null,
      resumen: c.resumenHandoff ?? null,
    })),
  );
}

const avisoDe = (m: MensajeEnviado) =>
  m.plantilla ? (m.parametros ?? []).join(" · ") : (m.texto ?? "");

/** Todo lo que dibuja la página en cada vuelta: el chat, la bandeja, los avisos y el gasto. */
export async function estadoDelSimulador(
  f: FuentesDelEstado,
  numero: string,
  delCliente: readonly MensajeDelCliente[],
) {
  const [enviados, leidos, bandeja, gasto] = await Promise.all([
    f.telefono.enviados(),
    f.telefono.leidos(),
    conversaciones(f.bandeja),
    f.gasto.delMes(),
  ]);
  const hilo = armarHilo(
    delCliente,
    enviados.filter((m) => m.para === numero),
    leidos,
  );
  const avisos = enviados
    .filter((m) => m.para === f.equipo)
    .map((m) => ({ en: m.en, texto: avisoDe(m) }))
    .reverse();
  return { ...hilo, bandeja, avisos, gasto };
}
