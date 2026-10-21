import type { ConsultaDePago, IProveedorDePago } from "../puertos/cobro.js";

/** Sin `KHIPU_API_KEY`: no se cobra y ningún aviso entrante se puede confirmar. */
export class KhipuSinConfigurar implements IProveedorDePago {
  async crearCobro(): Promise<never> {
    throw new Error("Khipu no está configurado");
  }

  async consultar(): Promise<ConsultaDePago> {
    return { estado: "pendiente" };
  }
}
