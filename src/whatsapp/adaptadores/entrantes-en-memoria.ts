import type { CartaMuerta, IEntrantes } from "../puertos/entrantes.js";

/** El registro de entrantes en memoria del proceso: desarrollo y pruebas. */
export class EntrantesEnMemoria implements IEntrantes {
  private readonly reclamos = new Map<
    string,
    { procesado: boolean; en: number }
  >();
  private readonly cartas: CartaMuerta[] = [];

  /** `vencimientoMs`: cuánto vive un reclamo «en proceso» antes de poder retomarse. */
  constructor(private readonly vencimientoMs = 300_000) {}

  async reclamar(mensajeId: string) {
    const actual = this.reclamos.get(mensajeId);
    if (actual?.procesado) return false;
    if (actual && Date.now() - actual.en < this.vencimientoMs) return false;
    this.reclamos.set(mensajeId, { procesado: false, en: Date.now() });
    return true;
  }

  async soltar(mensajeId: string) {
    if (!this.reclamos.get(mensajeId)?.procesado)
      this.reclamos.delete(mensajeId);
  }

  async marcarProcesado(mensajeId: string) {
    this.reclamos.set(mensajeId, { procesado: true, en: Date.now() });
  }

  async cartaMuerta(carta: CartaMuerta) {
    this.cartas.unshift({ ...carta, en: new Date().toISOString() });
  }

  async cartasMuertas() {
    return [...this.cartas];
  }
}
