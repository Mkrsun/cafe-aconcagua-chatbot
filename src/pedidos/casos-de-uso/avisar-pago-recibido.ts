import { pesos } from "../../plataforma/pesos.js";
import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import type { IBandeja } from "../../bandeja/puertos/bandeja.js";
import { decidirEnvio } from "../../clientes/dominio/decidir-envio.js";
import type {
  IClientes,
  IPoliticasDeContacto,
} from "../../clientes/puertos/clientes.js";
import {
  plantillaDePagoRecibido,
  type ConfiguracionDePlantilla,
} from "../../whatsapp/dominio/plantillas.js";
import {
  claveUltimoEntranteDeCliente,
  dentroDeLaVentana,
} from "../../whatsapp/dominio/ventana.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import type { IPedidos } from "../puertos/pedidos.js";

export interface DepsAvisarPagoRecibido {
  readonly pedidos: IPedidos;
  readonly clientes: IClientes;
  readonly politicas: IPoliticasDeContacto;
  readonly registros: IRegistros;
  readonly canal: ICanal;
  readonly bandeja: IBandeja;
  readonly reloj: Reloj;
  /** `WHATSAPP_PAYMENT_TEMPLATE`. */
  readonly plantilla?: ConfiguracionDePlantilla;
}

export const textoDePagoRecibido = (montoClp: number) =>
  `¡Recibimos tu pago de ${pesos(montoClp)}, muchas gracias! Ya estamos preparando tu pedido.`;

/**
 * El aviso de pago recibido, una sola vez por pedido. Con plantilla sale siempre la
 * plantilla; sin ella, texto libre solo dentro de la ventana. Antes manda el consentimiento.
 */
export class AvisarPagoRecibido {
  constructor(private readonly deps: DepsAvisarPagoRecibido) {}

  ejecutar(pedidoId: string): Promise<boolean> {
    const clave = claveDeRegistro("pago-recibido-avisado", pedidoId);
    return this.deps.registros.bajoLlave(clave, async () => {
      if (
        (await this.deps.registros.leer<{ enviado: boolean }>(clave))?.enviado
      )
        return true;
      const motivo = await this.enviar(pedidoId);
      await this.deps.registros.guardar(clave, { enviado: !motivo, motivo });
      if (motivo)
        console.warn(
          `aviso de pago del pedido ${pedidoId} no enviado: ${motivo}`,
        );
      return !motivo;
    });
  }

  /** Envía y devuelve `undefined`, o el motivo por el que no salió. */
  private async enviar(pedidoId: string): Promise<string | undefined> {
    const { pedidos, clientes, politicas, registros, canal, reloj, plantilla } =
      this.deps;
    const leido = await pedidos.obtener(pedidoId);
    const cliente = leido && (await clientes.porId(leido.pedido.clienteId));
    const telefono = cliente?.telefonos[0];
    if (!leido?.version || !cliente || !telefono)
      return "sin cliente o teléfono";
    const ahora = reloj();
    const ventanaAbierta = dentroDeLaVentana(
      await registros.leer(claveUltimoEntranteDeCliente(cliente.id)),
      ahora,
    );
    const politica = await politicas.de(cliente.id);
    const decision = decidirEnvio({
      politica,
      tipo: "transaccional",
      ahora,
      ventanaAbierta,
    });
    if (!decision.permitido) return decision.motivo;
    if (!plantilla && !ventanaAbierta)
      return "fuera de la ventana y sin plantilla de pago";
    const total = leido.version.total;
    const texto = textoDePagoRecibido(total);
    const envio = await canal.enviar({
      telefono,
      texto,
      ...(plantilla
        ? {
            plantilla: plantillaDePagoRecibido(
              plantilla,
              cliente.nombre,
              total,
            ),
          }
        : {}),
    });
    if (!envio.enviado) return envio.error ?? "WhatsApp no lo aceptó";
    const conversacion = await this.deps.bandeja.obtenerActiva(cliente.id);
    if (conversacion)
      await this.deps.bandeja.registrarChatbot(conversacion.id, texto, ahora);
    return undefined;
  }
}
