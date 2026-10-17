import type { ClienteDeEjemplo } from "../clientes-de-ejemplo.js";

export const AYUDA = [
  "Escribe como en WhatsApp: cada línea es un mensaje y puedes mandar varias seguidas.",
  "  un número   elige esa opción del último mensaje con botones o lista",
  "  /ubicacion  comparte una ubicación de ejemplo (Plaza Ñuñoa)",
  "  /pagar      simula que Khipu confirma el pago del último enlace",
  "  /ayuda      muestra esta ayuda",
  "  /salir      termina (también Ctrl+D)",
];

export const saludo = (c: ClienteDeEjemplo) => [
  `Escribes como ${c.nombre} (${c.tramo}, +${c.telefono}) al WhatsApp de Café Aconcagua ` +
    "en modo local.",
  "Si el chatbot no te reconoce, corre pnpm semilla. Escribe /ayuda para ver los comandos.",
  "",
];

export const AVISOS = {
  espera: "… El chatbot espera a que termines de escribir",
  escribiendo: "… El chatbot está escribiendo",
} as const;
