import type {
  ConsultaDePago,
  IProveedorDePago,
  SolicitudDeCobro,
} from "../puertos/cobro.js";

/** Khipu falso: crea enlaces https y deja marcar un pago como hecho, como lo haría el cliente. */
export class KhipuFalso implements IProveedorDePago {
  private readonly cobros = new Map<
    string,
    SolicitudDeCobro & { pagado: boolean }
  >();
  fallarAlCrear = false;

  async crearCobro(s: SolicitudDeCobro) {
    if (this.fallarAlCrear)
      throw new Error("khipu: HTTP 503 al crear el cobro");
    const id = `khipu_${this.cobros.size + 1}`;
    this.cobros.set(id, { ...s, pagado: false });
    return { id, url: `https://khipu.com/payment/info/${id}` };
  }

  async consultar(id: string): Promise<ConsultaDePago> {
    const cobro = this.cobros.get(id);
    if (!cobro?.pagado) return { estado: "pendiente" };
    return {
      estado: "pagado",
      montoClp: cobro.montoClp,
      referencia: cobro.referencia,
    };
  }

  /** El cliente pagó (opcionalmente otro monto, para probar la conciliación). */
  pagar(id: string, montoClp?: number) {
    const cobro = this.cobros.get(id);
    if (cobro)
      this.cobros.set(id, {
        ...cobro,
        pagado: true,
        montoClp: montoClp ?? cobro.montoClp,
      });
  }

  ultimoId() {
    return [...this.cobros.keys()].at(-1);
  }
}
