import { randomUUID } from "node:crypto";
import {
  MARCA_FOTOS,
  MOTIVO_RECLAMO,
  type ConversacionBandeja,
  type MensajeBandeja,
  type RegistroDeReclamo,
} from "./conversacion.js";

/** Lo que cambia una conversación: puro, así la memoria y PostgreSQL hacen lo mismo. */
export type Transicion = (c: ConversacionBandeja) => ConversacionBandeja;

export const nuevoMensaje = (
  m: Omit<MensajeBandeja, "id" | "creadoEn">,
  ahora: Date,
): MensajeBandeja => ({
  id: `msg_${randomUUID()}`,
  ...m,
  creadoEn: ahora.toISOString(),
});

export const conMensaje =
  (m: MensajeBandeja): Transicion =>
  (c) => ({
    ...c,
    ...(m.autor === "humano"
      ? { estado: "asignada" as const, propietario: m.autorNombre }
      : {}),
    mensajes: [...c.mensajes, m],
    actualizadaEn: m.creadoEn,
  });

const sinHandoff = ({
  motivoHandoff: _m,
  resumenHandoff: _r,
  ...resto
}: ConversacionBandeja): ConversacionBandeja => resto;

export const pausada =
  (motivo: string, resumen: string | undefined, ahora: Date): Transicion =>
  (c) => ({
    ...c,
    estado: "pausada",
    motivoHandoff: motivo,
    ...(resumen ? { resumenHandoff: resumen } : {}),
    actualizadaEn: ahora.toISOString(),
  });

/** Vuelve el chatbot; si una persona ya la llevaba, sigue asignada a ella. */
export const reanudada =
  (ahora: Date): Transicion =>
  (c) => ({
    ...sinHandoff(c),
    estado: c.propietario ? "asignada" : "abierta",
    actualizadaEn: ahora.toISOString(),
  });

export const resuelta =
  (ahora: Date): Transicion =>
  (c) => ({
    ...sinHandoff(c),
    estado: "resuelta",
    actualizadaEn: ahora.toISOString(),
  });

export const asignada =
  (quien: string, ahora: Date): Transicion =>
  (c) => ({
    ...c,
    estado: "asignada",
    propietario: quien,
    actualizadaEn: ahora.toISOString(),
  });

/**
 * Registra un reclamo SIN cambiar el estado: el chatbot sigue atendiendo y el equipo ve motivo y
 * resumen. La marca de fotos sobrevive a los registros siguientes del mismo reclamo.
 */
export const conReclamo =
  (r: RegistroDeReclamo, ahora: Date): Transicion =>
  (c) => {
    const conFotos =
      (r.imagenes ?? 0) > 0 || !!c.resumenHandoff?.includes(MARCA_FOTOS);
    const base = (r.resumen ?? c.resumenHandoff ?? "")
      .replace(` · ${MARCA_FOTOS}`, "")
      .replace(MARCA_FOTOS, "")
      .trim();
    const resumen = conFotos
      ? base
        ? `${base} · ${MARCA_FOTOS}`
        : MARCA_FOTOS
      : base;
    return {
      ...c,
      motivoHandoff: r.motivo ?? c.motivoHandoff ?? MOTIVO_RECLAMO,
      ...(resumen ? { resumenHandoff: resumen } : {}),
      actualizadaEn: ahora.toISOString(),
    };
  };
