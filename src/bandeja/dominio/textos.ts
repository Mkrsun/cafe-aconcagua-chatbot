/** Por qué una persona toma la conversación. */
export type TipoDeTraspaso = "caso" | "consulta" | "revision" | "pedido";

export const ROL_POR_DEFECTO = "la encargada";
const PRONTO = "y te escribe por aquí en un ratito.";
const POR_ESTE_CHAT = "te va a contactar por este mismo chat.";

const APERTURAS = {
  caso: ["Te entiendo, y quiero que esto quede bien resuelto", "tu caso"],
  consulta: [
    "Ese dato no lo tengo confirmado y prefiero no decirte algo equivocado",
    "tu consulta",
  ],
  revision: ["Esto prefiero revisarlo bien para no equivocarme", "tu consulta"],
} as const;

/**
 * El traspaso como lo diría una vendedora que llama a su encargada, nunca un bot que "deriva". El
 * rol sale de configuración (`CAFE_ROL_ENCARGADO`). `avisado` promete "en un ratito" solo si el
 * aviso al equipo salió; `sinAviso` es honesto: el caso quedó en la bandeja.
 */
export function traspaso(rol: string, tipo: TipoDeTraspaso) {
  const quien = rol.trim() || ROL_POR_DEFECTO;
  if (tipo === "pedido")
    return {
      avisado: `¡Buenísimo! Le paso tu pedido a ${quien} para que lo deje listo, ${PRONTO}`,
      sinAviso: `¡Buenísimo! Le dejé tu pedido a ${quien} para que lo deje listo; ${POR_ESTE_CHAT}`,
    };
  const [apertura, asunto] = APERTURAS[tipo];
  return {
    avisado: `${apertura}: le paso ${asunto} a ${quien}, que ${PRONTO.replace("y ", "")}`,
    sinAviso: `${apertura}: le dejé ${asunto} a ${quien}, que ${POR_ESTE_CHAT}`,
  };
}

/** Un acuse por pausa cuando el aviso todavía no salió: el cliente no le habla a la nada. */
export const acuseEnPausa = (rol: string) =>
  `Recibí tu mensaje y lo dejé anotado para ${rol.trim() || ROL_POR_DEFECTO}, que ` +
  `${POR_ESTE_CHAT} Gracias por la paciencia.`;
