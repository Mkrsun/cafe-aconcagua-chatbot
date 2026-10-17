import { claveDeRegistro } from "../../plataforma/registros/puerto.js";
import { soloDigitos } from "../../plataforma/telefono.js";

/** La ventana de servicio de WhatsApp: 24 h desde el último mensaje del cliente. */
export const VENTANA_MS = 24 * 60 * 60 * 1000;

/** Abierta solo si hay registro y tiene menos de 24 h; sin registro se asume fuera. */
export const dentroDeLaVentana = (
  ultimo: { readonly at: string } | undefined,
  ahora: Date,
): boolean => !!ultimo && ahora.getTime() - Date.parse(ultimo.at) < VENTANA_MS;

/** Último entrante de un cliente. */
export const claveUltimoEntranteDeCliente = (clienteId: string) =>
  claveDeRegistro("whatsapp-ultimo-entrante", clienteId);

/** Último entrante de un teléfono, sea o no cliente. */
export const claveUltimoEntranteDeTelefono = (telefono: string) =>
  claveDeRegistro(
    "whatsapp-ultimo-entrante-del-telefono",
    soloDigitos(telefono),
  );
