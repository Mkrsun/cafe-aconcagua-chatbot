import type { DatosDeTarifa } from "../../catalogo/dominio/despacho/tarifa.js";
import type { Formato } from "../../catalogo/dominio/formato.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import type { DatosDeCliente } from "../../clientes/dominio/cliente.js";
import type { Consentimiento } from "../../clientes/dominio/politica.js";
import type { Tema } from "../../faq/dominio/entrada.js";

/** Un formato del catálogo con el precio de cada tramo; `null` deja el precio pendiente. */
export interface FormatoDefinido extends Omit<Formato, "disponible"> {
  readonly disponible?: boolean;
  readonly precios: Readonly<Record<Tramo, number | null>>;
}

/** Una zona de despacho; la zona es su nombre y su identidad. */
export type ZonaDefinida = Omit<DatosDeTarifa, "activa"> & {
  readonly activa?: boolean;
};

/** Una pregunta frecuente publicada (sin montos: los precios salen del catálogo). */
export interface PreguntaDefinida {
  readonly pregunta: string;
  readonly respuesta: string;
  readonly tema: Tema;
}

/** Las notas de cata de un café (su familia); vacías mientras no estén escritas. */
export interface PerfilDefinido {
  readonly familia: string;
  readonly notas: string;
}

/** Un cliente con su consentimiento de WhatsApp y de dónde viene. */
export interface ClienteDefinido extends DatosDeCliente {
  readonly consentimiento: Consentimiento;
  readonly fuente: string;
}

/** Lo que define el negocio de Café: la base queda igual a esto después de cargarlo. */
export interface DefinicionesDeCafe {
  readonly catalogo: readonly FormatoDefinido[];
  readonly despacho: readonly ZonaDefinida[];
  readonly preguntas: readonly PreguntaDefinida[];
  readonly perfiles: readonly PerfilDefinido[];
}
