/** Los clientes de la semilla: la CLI `pnpm conversar` escribe con sus teléfonos. */
export const CLIENTES_DE_EJEMPLO = {
  minorista: {
    nombre: "Ana Pérez",
    tipo: "minorista",
    tramo: "minorista",
    telefono: "56911112222",
  },
  mayorista: {
    nombre: "Emporio Dos Hermanos",
    tipo: "mayorista-tienda",
    tramo: "mayorista",
    telefono: "56933334444",
  },
} as const;

export type ClienteDeEjemplo =
  (typeof CLIENTES_DE_EJEMPLO)[keyof typeof CLIENTES_DE_EJEMPLO];
