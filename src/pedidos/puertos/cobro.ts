export interface SolicitudDeCobro {
  /** El id del pedido: Khipu lo devuelve como `transaction_id`. */
  readonly referencia: string;
  readonly montoClp: number;
  readonly asunto: string;
}

export interface ConsultaDePago {
  readonly estado: "pendiente" | "pagado" | "rechazado" | "vencido";
  readonly montoClp?: number;
  readonly referencia?: string;
}

/** El cobro (borde: Khipu). Real: `Khipu` · fake: `KhipuFalso`. */
export interface IProveedorDePago {
  crearCobro(
    s: SolicitudDeCobro,
  ): Promise<{ readonly id: string; readonly url: string }>;
  /** La confirmación siempre se consulta al proveedor: el aviso entrante no se cree. */
  consultar(id: string): Promise<ConsultaDePago>;
}
