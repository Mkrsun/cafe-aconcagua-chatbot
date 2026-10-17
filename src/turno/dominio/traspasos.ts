import type { TipoDeTraspaso } from "../../bandeja/dominio/textos.js";
import type { SenalDeEnojo } from "./animo.js";

/** Un traspaso que pide el turno: el texto al cliente lo elige quien avisa. */
export interface PedidoDeTraspaso {
  readonly tipo: TipoDeTraspaso;
  readonly motivo: string;
  /** Dos líneas: qué dijo el cliente y qué hacer para retomarlo. */
  readonly resumen: string;
}

const resumen = (texto: string, queHacer: string) =>
  `Cliente: "${texto.replace(/\s+/g, " ").trim().slice(0, 300)}"\n${queHacer}`;

export const porEnojo = (
  texto: string,
  senales: readonly SenalDeEnojo[],
): PedidoDeTraspaso => ({
  tipo: "caso",
  motivo: senales.includes("pide-persona")
    ? "El cliente pidió hablar con una persona"
    : `Cliente molesto: ${senales.join(", ")}`,
  resumen: resumen(texto, "Escríbele desde la bandeja para retomar su caso."),
});

export const porPrecioPendiente = (
  texto: string,
  sku: string,
): PedidoDeTraspaso => ({
  tipo: "consulta",
  motivo: `Precio pendiente de ${sku}: el cliente quiere pedirlo`,
  resumen: resumen(
    texto,
    `Cargar el precio de ${sku} en el catálogo y responderle.`,
  ),
});

export const porZonaSinTarifa = (
  texto: string,
  zona: string,
): PedidoDeTraspaso => ({
  tipo: "consulta",
  motivo: `Despacho a «${zona}» sin tarifa definida`,
  resumen: resumen(
    texto,
    `Definir el despacho a ${zona} en Despacho, o cotizarle a mano.`,
  ),
});

export const porFaltaDeDato = (
  texto: string,
  faltantes: readonly string[],
): PedidoDeTraspaso => ({
  tipo: "consulta",
  motivo: faltantes.length
    ? `El chatbot no tiene el dato: ${faltantes.join(", ")}`
    : "El chatbot no puede resolverlo",
  resumen: resumen(
    texto,
    "Responderle y, si sirve a otros, publicarlo en la FAQ.",
  ),
});

export const porDerivacion = (texto: string): PedidoDeTraspaso => ({
  tipo: "caso",
  motivo: "El chatbot pidió que lo vea una persona",
  resumen: resumen(texto, "Escríbele desde la bandeja para retomar su caso."),
});

export const porRevision = (
  texto: string,
  causa: string,
): PedidoDeTraspaso => ({
  tipo: "revision",
  motivo: causa,
  resumen: resumen(
    texto,
    "Revisar la conversación y responderle desde la bandeja.",
  ),
});

export const porPedidoSinCobro = (
  texto: string,
  pedidoId: string,
): PedidoDeTraspaso => ({
  tipo: "pedido",
  motivo: `Pedido ${pedidoId} confirmado sin cobro automático`,
  resumen: resumen(
    texto,
    `Cobrar el pedido ${pedidoId} y confirmarle el despacho.`,
  ),
});
