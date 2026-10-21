import type { PreguntaDefinida } from "../src/carga/index.js";

/**
 * Las preguntas frecuentes que el chatbot puede contestar (horarios, retiro, medios de pago,
 * facturación…). Sin montos: los precios salen del catálogo. Lo que no está aquí, el chatbot no lo
 * inventa: le pasa la consulta a la encargada. Temas: horarios, ubicacion, despacho, pagos,
 * cambios, facturacion, pedidos, productos o general. Ejemplo:
 *
 *   { pregunta: "¿Cuál es el horario de atención?", tema: "horarios",
 *     respuesta: "De lunes a viernes, de 10:00 a 18:00." }
 */
export const PREGUNTAS_FRECUENTES: readonly PreguntaDefinida[] = [];
