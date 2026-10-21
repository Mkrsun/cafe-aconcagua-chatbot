import type { Reloj } from "../../plataforma/reloj.js";
import {
  clasificarMensaje,
  type ClaseDeMensaje,
} from "../../whatsapp/dominio/espera/clasificar.js";
import type { TiemposDeEspera } from "../../whatsapp/dominio/espera/tiempos.js";
import { vencimientoDelLote } from "../../whatsapp/dominio/espera/vencimiento.js";
import type { EventoEntrante } from "../../whatsapp/dominio/evento.js";
import {
  textoParaElTurno,
  textoParaLaBandeja as delEntrante,
} from "../../whatsapp/dominio/interactivos/entrantes.js";
import type { IColaDeEntrantes } from "../../whatsapp/puertos/cola.js";

const MARCAS: Partial<Record<EventoEntrante["tipo"], string>> = {
  audio: "[audio]",
  image: "[imagen]",
  sticker: "[sticker]",
  document: "[documento]",
  otro: "[mensaje no textual]",
};

/** Cómo queda un mensaje en la bandeja: el texto, la elección o una marca de lo que no es texto. */
export const textoParaLaBandeja = (e: EventoEntrante) =>
  e.entrante
    ? delEntrante(e.entrante)
    : (e.texto ?? MARCAS[e.tipo] ?? "[mensaje]");

/** La elección de un botón o lista y una ubicación son respuestas completas: espera corta. */
const claseDe = (e: EventoEntrante, texto?: string): ClaseDeMensaje =>
  e.entrante?.tipo === "eleccion" || e.entrante?.tipo === "ubicacion"
    ? "cierre"
    : clasificarMensaje(texto);

/** Encola el mensaje con la espera humana que corresponde a cómo terminó. */
export async function encolar(
  deps: {
    readonly cola: IColaDeEntrantes;
    readonly tiempos: TiemposDeEspera;
    readonly reloj: Reloj;
  },
  e: EventoEntrante,
): Promise<void> {
  const texto = e.entrante ? textoParaElTurno(e.entrante) : e.texto;
  await deps.cola.encolar(
    {
      id: e.id,
      contacto: e.telefono,
      ...(texto ? { texto } : {}),
      tipo: e.tipo,
      textoCliente: textoParaLaBandeja(e),
      ...(e.citaA ? { citaA: e.citaA } : {}),
      recibidoEn: deps.reloj(),
    },
    claseDe(e, texto),
    (estado) => vencimientoDelLote(estado, deps.tiempos),
  );
}
