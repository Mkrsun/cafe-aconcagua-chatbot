import { DatosInvalidos } from "../../plataforma/errores.js";

export const CONSENTIMIENTOS = ["desconocido", "otorgado", "retirado"] as const;
export type Consentimiento = (typeof CONSENTIMIENTOS)[number];

/** Cuándo y cuánto se le puede escribir a un cliente por iniciativa propia. */
export interface PoliticaDeContacto {
  /** El consentimiento general. */
  readonly consentimiento: Consentimiento;
  /** El de WhatsApp, si se registró aparte: manda sobre el general. */
  readonly whatsapp?: Consentimiento;
  readonly fuente: string;
  readonly minDiasEntreContactos: number;
  /** Horario de contacto (HH:MM) en la zona horaria del cliente. */
  readonly ventana: { readonly desde: string; readonly hasta: string };
  readonly zonaHoraria: string;
  readonly actualizadaPor?: string;
  readonly actualizadaEn?: string;
}

export const POLITICA_POR_DEFECTO: PoliticaDeContacto = {
  consentimiento: "desconocido",
  fuente: "sin registro",
  minDiasEntreContactos: 7,
  ventana: { desde: "09:00", hasta: "18:00" },
  zonaHoraria: "America/Santiago",
};

/** Un cambio de consentimiento: quién y desde qué valor (`cafe.cambios_de_consentimiento`). */
export interface CambioDePolitica {
  readonly anterior: Consentimiento;
  readonly consentimiento: Consentimiento;
  readonly fuente: string;
  readonly actor: string;
  readonly en: string;
}

/** El consentimiento que rige para WhatsApp. */
export const consentimientoDeWhatsApp = (
  p: PoliticaDeContacto,
): Consentimiento => p.whatsapp ?? p.consentimiento;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function consentimiento(v: unknown, campo: string): Consentimiento {
  if (!CONSENTIMIENTOS.includes(v as Consentimiento))
    throw new DatosInvalidos(
      `${campo} debe ser desconocido, otorgado o retirado`,
    );
  return v as Consentimiento;
}

function ventana(v: unknown) {
  if (v === undefined) return POLITICA_POR_DEFECTO.ventana;
  const { desde, hasta } = (v ?? {}) as Record<string, unknown>;
  if (
    typeof desde !== "string" ||
    typeof hasta !== "string" ||
    !HORA.test(desde)
  )
    throw new DatosInvalidos("ventana debe tener desde y hasta en HH:MM");
  if (!HORA.test(hasta) || desde >= hasta)
    throw new DatosInvalidos("ventana.desde debe ser anterior a ventana.hasta");
  return { desde, hasta };
}

/** Lo que manda el equipo al cambiar la política, limpio y válido. */
export function validarPolitica(
  crudo: Record<string, unknown>,
): PoliticaDeContacto {
  const fuente = typeof crudo.fuente === "string" ? crudo.fuente.trim() : "";
  if (fuente.length < 2 || fuente.length > 200)
    throw new DatosInvalidos(
      "fuente debe decir de dónde viene el consentimiento",
    );
  const dias = crudo.minDiasEntreContactos ?? 7;
  if (
    !Number.isSafeInteger(dias) ||
    (dias as number) < 1 ||
    (dias as number) > 90
  )
    throw new DatosInvalidos(
      "minDiasEntreContactos debe ser un entero entre 1 y 90",
    );
  return {
    ...POLITICA_POR_DEFECTO,
    consentimiento: consentimiento(crudo.consentimiento, "consentimiento"),
    ...(crudo.whatsapp === undefined || crudo.whatsapp === null
      ? {}
      : { whatsapp: consentimiento(crudo.whatsapp, "whatsapp") }),
    fuente,
    minDiasEntreContactos: dias as number,
    ventana: ventana(crudo.ventana),
  };
}
