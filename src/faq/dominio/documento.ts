import type {
  DatosDeEntrada,
  EntradaDeFaq,
  EstadoDeEntrada,
} from "./entrada.js";

export type AccionSobreEntrada =
  "creada" | "editada" | "publicada" | "despublicada" | "eliminada";

/** Un cambio del historial: quién, cuándo y cómo quedó la entrada. */
export interface CambioDeEntrada {
  readonly entradaId: string;
  readonly accion: AccionSobreEntrada;
  readonly actor: string;
  readonly en: string;
  readonly entrada: DatosDeEntrada & { readonly estado: EstadoDeEntrada };
}

/** Cómo se guarda la base: un documento con las entradas y el historial. */
export interface DocumentoDeFaq {
  readonly entradas: readonly EntradaDeFaq[];
  /** El más nuevo primero, acotado. */
  readonly historial: readonly CambioDeEntrada[];
}

export const DOCUMENTO_VACIO: DocumentoDeFaq = { entradas: [], historial: [] };
export const MAXIMO_DE_CAMBIOS = 1000;

export const cambioSobre = (
  e: EntradaDeFaq,
  accion: AccionSobreEntrada,
  actor: string,
): CambioDeEntrada => ({
  entradaId: e.id,
  accion,
  actor,
  en: e.actualizadoEn,
  entrada: {
    pregunta: e.pregunta,
    respuesta: e.respuesta,
    tema: e.tema,
    estado: e.estado,
  },
});
