import type { PreguntaDefinida, ZonaDefinida } from "../../src/carga/index.js";

export interface PrecioDeEjemplo {
  readonly sku: string;
  readonly minorista: number;
  readonly mayorista: number;
}

/** Precios de ejemplo (CLP) para formatos del catálogo de Café (`definiciones/catalogo.ts`). */
export const PRECIOS: readonly PrecioDeEjemplo[] = [
  { sku: "0028", minorista: 9990, mayorista: 8490 },
  { sku: "0025", minorista: 9990, mayorista: 8490 },
  { sku: "0085", minorista: 14990, mayorista: 12790 },
  { sku: "0084", minorista: 14990, mayorista: 12790 },
  { sku: "0095", minorista: 10990, mayorista: 9290 },
  { sku: "0094", minorista: 10990, mayorista: 9290 },
];

export const ZONAS: readonly ZonaDefinida[] = [
  {
    zona: "Santiago oriente",
    comunas: ["Ñuñoa", "Providencia", "Las Condes", "La Reina"],
    montoClp: 3990,
    gratisDesdeClp: 40000,
    plazo: { desdeDias: 1, hastaDias: 2 },
  },
  {
    zona: "Santiago centro",
    comunas: ["Santiago", "Recoleta", "Independencia"],
    montoClp: 2990,
    plazo: { desdeDias: 1, hastaDias: 2 },
  },
];

/** Sin montos: los precios salen del catálogo. */
export const PREGUNTAS: readonly PreguntaDefinida[] = [
  {
    pregunta: "¿Cuál es el horario de atención?",
    respuesta:
      "Atendemos de lunes a viernes de 10:00 a 18:00 y los sábados de 10:00 a 14:00.",
    tema: "horarios",
  },
  {
    pregunta: "¿Puedo retirar mi pedido en persona?",
    respuesta:
      "Sí. Escríbenos por este chat y coordinamos el día y la hora del retiro.",
    tema: "pedidos",
  },
  {
    pregunta: "¿Qué medios de pago aceptan?",
    respuesta:
      "Al confirmar tu pedido te enviamos un botón para pagar con Khipu, por transferencia " +
      "desde tu banco.",
    tema: "pagos",
  },
];
