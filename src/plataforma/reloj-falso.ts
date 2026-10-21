import type { Reloj } from "./reloj.js";

/** Un reloj que solo avanza cuando la prueba lo dice. */
export class RelojFalso {
  private actual: number;

  constructor(inicio: Date) {
    this.actual = inicio.getTime();
  }

  readonly ahora: Reloj = () => new Date(this.actual);

  avanzar(ms: number): void {
    this.actual += ms;
  }

  fijar(fecha: Date): void {
    this.actual = fecha.getTime();
  }
}
