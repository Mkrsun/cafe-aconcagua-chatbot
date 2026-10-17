import type { ContenidoInteractivo } from "../dominio/interactivos/contenido.js";
import type { PlantillaSaliente } from "../dominio/plantillas.js";

/** Un mensaje listo para salir por WhatsApp. */
export interface MensajeSaliente {
  readonly telefono: string;
  /** El texto, o el equivalente legible completo del contenido o la plantilla. */
  readonly texto: string;
  /** Fuera de la ventana de 24 h solo sale una plantilla: si viene, manda sobre todo lo demás. */
  readonly plantilla?: PlantillaSaliente;
  readonly contenido?: ContenidoInteractivo;
  /** El mensaje del cliente que esta respuesta cita. */
  readonly citando?: string;
}

/** Graph: el cliente no escribió en las últimas 24 h; solo sale una plantilla. */
export const ERROR_FUERA_DE_VENTANA = 131047;

export interface ResultadoEnvio {
  readonly enviado: boolean;
  readonly idDelProveedor?: string;
  readonly error?: string;
  readonly codigoError?: number;
}

/**
 * El canal de salida (borde: WhatsApp Cloud API). Real: `CanalWhatsApp` · fake: `CanalEnMemoria`.
 */
export interface ICanal {
  enviar(mensaje: MensajeSaliente): Promise<ResultadoEnvio>;
  /** El visto y «escribiendo…»: lanza si Meta lo rechaza (quien llama lo ignora). */
  marcarLeido(
    mensajeId: string,
    opciones?: { readonly escribiendo?: boolean },
  ): Promise<void>;
}
