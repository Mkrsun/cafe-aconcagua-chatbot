/**
 * Errores del dominio: dato inválido, algo que no existe, un conflicto con lo guardado o un borde
 * que no aceptó. Viven en la plataforma para que todas las features hablen igual.
 */
export class DatosInvalidos extends Error {
  constructor(readonly detalle: string) {
    super(detalle);
    this.name = "DatosInvalidos";
  }
}

export class NoEncontrado extends Error {
  constructor(readonly que: string) {
    super(`${que} no existe`);
    this.name = "NoEncontrado";
  }
}

/** Un conflicto con lo guardado: revisión vieja, dato repetido o una regla del negocio. */
export class Conflicto extends Error {
  constructor(
    readonly codigo: string,
    readonly actual?: unknown,
  ) {
    super(codigo);
    this.name = "Conflicto";
  }
}

/** Un borde externo (WhatsApp, Khipu) no aceptó la operación: 502 para quien la pidió. */
export class FalloExterno extends Error {
  constructor(
    readonly codigo: string,
    readonly detalle: string,
  ) {
    super(`${codigo}: ${detalle}`);
    this.name = "FalloExterno";
  }
}
