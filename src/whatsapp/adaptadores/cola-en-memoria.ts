import { randomUUID } from "node:crypto";
import type { ClaseDeMensaje } from "../dominio/espera/clasificar.js";
import type {
  EstadoFinalDelLote,
  IColaDeEntrantes,
  LoteEnCola,
  MensajeEnCola,
  Vencer,
} from "../puertos/cola.js";

type Estado = "abierto" | "generando" | "enviando" | EstadoFinalDelLote;

interface Fila {
  readonly id: string;
  readonly contacto: string;
  readonly mensajes: MensajeEnCola[];
  readonly abiertoEn: Date;
  estado: Estado;
  ultimoMensajeEn: Date;
  ultimaClase: ClaseDeMensaje;
  venceEn: Date;
  tomadoHasta?: Date;
  version: number;
  reprocesos: number;
  tomas: number;
}

const EN_CURSO: readonly Estado[] = ["generando", "enviando"];

/** La cola en memoria del proceso: desarrollo y pruebas (no sobrevive a un reinicio). */
export class ColaEnMemoria implements IColaDeEntrantes {
  private readonly filas: Fila[] = [];
  private readonly ids = new Set<string>();

  async encolar(m: MensajeEnCola, clase: ClaseDeMensaje, vencer: Vencer) {
    if (this.ids.has(m.id)) return "duplicado" as const;
    this.ids.add(m.id);
    const fila =
      this.delContacto(m.contacto, ["abierto"])[0] ??
      this.delContacto(m.contacto, ["generando"]).find(
        (f) => f.reprocesos === 0,
      ) ??
      this.abrir(m);
    fila.mensajes.push(m);
    fila.ultimoMensajeEn = m.recibidoEn;
    fila.ultimaClase = clase;
    fila.version += 1;
    fila.venceEn = vencer(fila);
    return "encolado" as const;
  }

  async tomarVencidos(
    ahora: Date,
    opciones: { leaseMs: number; limite: number },
  ) {
    const t = ahora.getTime();
    const vivo = (f: Fila) =>
      EN_CURSO.includes(f.estado) && (f.tomadoHasta?.getTime() ?? 0) > t;
    const tomables = this.filas
      .filter(
        (f) =>
          (f.estado === "abierto" && f.venceEn.getTime() <= t) ||
          (EN_CURSO.includes(f.estado) && !vivo(f)),
      )
      // De a un lote por contacto: uno en curso (aunque su lease venció) se retoma primero, solo.
      .filter(
        (f) => !this.delContacto(f.contacto, EN_CURSO).some((o) => o !== f),
      )
      .sort((a, b) => a.venceEn.getTime() - b.venceEn.getTime())
      .slice(0, opciones.limite);
    return tomables.map((f): LoteEnCola => {
      f.estado = "generando";
      f.tomadoHasta = new Date(t + opciones.leaseMs);
      f.tomas += 1;
      const { id, contacto, version, reprocesos, tomas } = f;
      return {
        id,
        contacto,
        mensajes: [...f.mensajes],
        version,
        reprocesos,
        tomas,
      };
    });
  }

  async confirmarEnvio(loteId: string, version: number) {
    const fila = this.filas.find((f) => f.id === loteId);
    if (fila?.estado !== "generando") return false;
    if (fila.version === version) {
      fila.estado = "enviando";
      return true;
    }
    fila.estado = "abierto";
    fila.reprocesos += 1;
    fila.tomadoHasta = undefined;
    return false;
  }

  async cerrar(loteId: string, estado: EstadoFinalDelLote) {
    const fila = this.filas.find((f) => f.id === loteId);
    if (!fila) return;
    fila.estado = estado;
    fila.tomadoHasta = undefined;
  }

  private delContacto(contacto: string, estados: readonly Estado[]) {
    return this.filas.filter(
      (f) => f.contacto === contacto && estados.includes(f.estado),
    );
  }

  private abrir(m: MensajeEnCola): Fila {
    const fila: Fila = {
      id: randomUUID(),
      contacto: m.contacto,
      mensajes: [],
      abiertoEn: m.recibidoEn,
      estado: "abierto",
      ultimoMensajeEn: m.recibidoEn,
      ultimaClase: "normal",
      venceEn: m.recibidoEn,
      version: 0,
      reprocesos: 0,
      tomas: 0,
    };
    this.filas.push(fila);
    return fila;
  }
}
