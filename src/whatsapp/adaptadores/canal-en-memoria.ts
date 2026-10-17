import type {
  ICanal,
  MensajeSaliente,
  ResultadoEnvio,
} from "../puertos/canal.js";

/** El canal falso: guarda lo enviado; `fallar` decide qué envíos rechaza (como lo haría Meta). */
export class CanalEnMemoria implements ICanal {
  readonly enviados: MensajeSaliente[] = [];
  readonly leidos: string[] = [];
  fallar: (m: MensajeSaliente) => ResultadoEnvio | undefined = () => undefined;

  async enviar(mensaje: MensajeSaliente): Promise<ResultadoEnvio> {
    const fallo = this.fallar(mensaje);
    if (fallo) return fallo;
    this.enviados.push(mensaje);
    return {
      enviado: true,
      idDelProveedor: `wamid.out.${this.enviados.length}`,
    };
  }

  async marcarLeido(mensajeId: string): Promise<void> {
    this.leidos.push(mensajeId);
  }

  /** Lo enviado a un teléfono, en orden. */
  a(telefono: string): readonly MensajeSaliente[] {
    return this.enviados.filter((m) => m.telefono === telefono);
  }
}
