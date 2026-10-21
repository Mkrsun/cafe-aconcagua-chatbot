/** Un cliente final del tramo minorista, el caso más común del banco. */
export const minorista = (nombre: string) =>
  ({ nombre, tipo: "minorista", tramo: "minorista" }) as const;
