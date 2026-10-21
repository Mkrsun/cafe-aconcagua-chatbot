import {
  consentimientoDeWhatsApp,
  type PoliticaDeContacto,
} from "./politica.js";

/**
 * `respuesta`: el asistente o el equipo contestan dentro de un hilo vivo. `transaccional`: el aviso
 * de un pago. `promocional`: reservado (v1 no envía promociones).
 */
export type TipoDeEnvio = "respuesta" | "transaccional" | "promocional";

export interface SolicitudDeEnvio {
  readonly politica: PoliticaDeContacto;
  readonly tipo: TipoDeEnvio;
  readonly ahora: Date;
  /** Si el cliente escribió en las últimas 24 h (la ventana de WhatsApp). */
  readonly ventanaAbierta: boolean;
  readonly ultimoContacto?: Date;
}

export interface DecisionDeEnvio {
  readonly permitido: boolean;
  readonly motivo: string;
}

const si = (motivo: string): DecisionDeEnvio => ({ permitido: true, motivo });
const no = (motivo: string): DecisionDeEnvio => ({ permitido: false, motivo });

const DIA_MS = 86_400_000;

/** La hora local `HH:MM` de `fecha` en la zona del cliente. */
const horaEn = (fecha: Date, zona: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fecha);

/** La línea roja del consentimiento: pura, con su motivo para el log. */
export function decidirEnvio(s: SolicitudDeEnvio): DecisionDeEnvio {
  const consentimiento = consentimientoDeWhatsApp(s.politica);
  if (s.tipo === "respuesta")
    return s.ventanaAbierta
      ? si("respuesta dentro de la ventana de 24 h")
      : no("fuera de la ventana de 24 h solo sale una plantilla");
  if (consentimiento === "retirado")
    return no("el cliente retiró su consentimiento");
  if (s.tipo === "transaccional")
    return si("aviso transaccional con consentimiento vigente");
  if (consentimiento !== "otorgado") return no("sin consentimiento explícito");
  const hora = horaEn(s.ahora, s.politica.zonaHoraria);
  const { desde, hasta } = s.politica.ventana;
  if (hora < desde || hora >= hasta)
    return no(`fuera del horario de contacto (${hora})`);
  const minimo = s.politica.minDiasEntreContactos * DIA_MS;
  if (
    s.ultimoContacto &&
    s.ahora.getTime() - s.ultimoContacto.getTime() < minimo
  )
    return no("todavía no pasan los días mínimos desde el último contacto");
  return si("promoción permitida por la política");
}
