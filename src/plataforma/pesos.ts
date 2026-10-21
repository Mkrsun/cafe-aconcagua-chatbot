const formato = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** Un monto en pesos chilenos como lo lee el cliente: `$12.990`. */
export const pesos = (montoClp: number): string =>
  `$${formato.format(montoClp)}`;
