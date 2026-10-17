/** Textos fijos del turno: los pone el sistema, nunca el modelo (voz de Café, sin voseo). */
export const TEXTOS = {
  cierre: "¡A ti! Aquí estoy cuando me necesites.",
  queCambiar: "Sin problema. ¿Qué te gustaría cambiar?",
  sinEnlace: "Todavía no hay un link de pago activo.",
  precioCambio:
    "Ojo: el precio cambió desde el resumen anterior, así que te lo dejo actualizado.",
  noDisponible: "por ahora no lo tenemos disponible",
  porConfirmar: "precio por confirmar",
  cierreDelResumen: "¿Lo dejamos así?",
  acuseAudio:
    "¡Gracias por el audio! Por ahora no puedo escucharlos; ¿me lo escribes, porfa?",
  acuseImagen:
    "¡Gracias por la foto! Cuéntame en un mensaje qué necesitas y te ayudo.",
  acuseOtro:
    "¡Gracias! Ese formato no lo puedo abrir; ¿me lo escribes en un mensaje?",
  desconocido:
    "¡Hola! Gracias por escribir a Café Aconcagua. Le dejé tu mensaje al equipo y te " +
    "responden por aquí apenas puedan.",
  /** Si el aviso al equipo no salió: no se promete nada que nadie va a cumplir. */
  desconocidoSinAviso:
    "¡Hola! Gracias por escribir a Café Aconcagua. En este momento no pude dejarle tu mensaje " +
    "al equipo: por favor vuelve a escribirnos en un rato.",
} as const;

export const pedidoRegistrado = (url: string) =>
  `¡Listo, quedó tu pedido! Aquí puedes pagarlo: ${url}`;

export const enlaceDePago = (url: string) =>
  `Aquí puedes pagar tu pedido: ${url}`;

/** Un precio pendiente: nunca un monto inventado; lo confirma quien recibe los traspasos. */
export const precioPorConfirmar = (rol: string, cantidad: number) =>
  cantidad > 1
    ? `Esos precios todavía no los tengo confirmados; te los confirma ${rol}.`
    : `Ese precio todavía no lo tengo confirmado; te lo confirma ${rol}.`;
