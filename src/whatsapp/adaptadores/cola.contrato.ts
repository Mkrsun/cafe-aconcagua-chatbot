import { describe, expect, it } from "vitest";
import type {
  IColaDeEntrantes,
  MensajeEnCola,
  Vencer,
} from "../puertos/cola.js";

/** Dos despachadores sobre la misma cola: otra réplica. */
export interface ArnesDeLaCola {
  readonly cola: IColaDeEntrantes;
  readonly otra: IColaDeEntrantes;
}

const T0 = Date.parse("2026-10-16T15:00:00.000Z");
const en = (s: number) => new Date(T0 + s * 1000);
const LEASE = { leaseMs: 60_000, limite: 10 };
/** Vence 10 s después del último mensaje. */
const vencer: Vencer = (e) => new Date(e.ultimoMensajeEn.getTime() + 10_000);

const mensaje = (
  id: string,
  s: number,
  extra: Partial<MensajeEnCola> = {},
): MensajeEnCola => ({
  id,
  contacto: "56911112222",
  texto: `texto ${id}`,
  tipo: "text",
  textoCliente: `texto ${id}`,
  recibidoEn: en(s),
  ...extra,
});
const encolar = (cola: IColaDeEntrantes, m: MensajeEnCola) =>
  cola.encolar(m, "normal", vencer);
const ids = (l: { mensajes: readonly MensajeEnCola[] } | undefined) =>
  l?.mensajes.map((m) => m.id);

/** El contrato de la cola durable: lo pasan la memoria y PostgreSQL. */
export function contratoDeLaCola(arnes: () => Promise<ArnesDeLaCola>) {
  describe("contrato de la cola de entrantes", () => {
    it("es idempotente y junta los mensajes de un contacto en orden", async () => {
      const { cola } = await arnes();
      expect(await encolar(cola, mensaje("w1", 0))).toBe("encolado");
      expect(await encolar(cola, mensaje("w1", 1))).toBe("duplicado");
      await encolar(
        cola,
        mensaje("w2", 1, { tipo: "image", textoCliente: "[imagen]" }),
      );
      await encolar(cola, mensaje("x1", 2, { contacto: "56933334444" }));
      const lotes = await cola.tomarVencidos(en(60), LEASE);
      expect(lotes.map(ids).sort()).toEqual([["w1", "w2"], ["x1"]]);
      const delCliente = lotes.find((l) => l.contacto === "56911112222")!;
      expect(delCliente.mensajes[1]).toMatchObject({
        tipo: "image",
        recibidoEn: en(1),
      });
    });

    it("solo toma lo vencido, y cada mensaje alarga la espera", async () => {
      const { cola } = await arnes();
      await encolar(cola, mensaje("w1", 0));
      await encolar(cola, mensaje("w2", 8));
      expect(await cola.tomarVencidos(en(12), LEASE)).toEqual([]);
      expect(ids((await cola.tomarVencidos(en(18), LEASE))[0])).toEqual([
        "w1",
        "w2",
      ]);
    });

    it("dos despachadores a la vez no toman el mismo lote", async () => {
      const { cola, otra } = await arnes();
      await encolar(cola, mensaje("w1", 0));
      const [a, b] = await Promise.all([
        cola.tomarVencidos(en(60), LEASE),
        otra.tomarVencidos(en(60), LEASE),
      ]);
      expect([...a, ...b]).toHaveLength(1);
    });

    it("un mensaje durante la generación descarta la respuesta una sola vez", async () => {
      const { cola } = await arnes();
      await encolar(cola, mensaje("w1", 0));
      const [lote] = await cola.tomarVencidos(en(20), LEASE);
      await encolar(cola, mensaje("w2", 21));
      expect(await cola.confirmarEnvio(lote!.id, lote!.version)).toBe(false);
      const [otraVez] = await cola.tomarVencidos(en(40), LEASE);
      expect(otraVez).toMatchObject({ id: lote!.id, reprocesos: 1 });
      expect(ids(otraVez)).toEqual(["w1", "w2"]);
      await encolar(cola, mensaje("w3", 41));
      expect(await cola.confirmarEnvio(otraVez!.id, otraVez!.version)).toBe(
        true,
      );
      await cola.cerrar(otraVez!.id, "entregado");
      expect(ids((await cola.tomarVencidos(en(60), LEASE))[0])).toEqual(["w3"]);
    });

    it("los lotes de un contacto van de a uno; un lease vencido se retoma", async () => {
      const { cola } = await arnes();
      await encolar(cola, mensaje("w1", 0));
      const [primero] = await cola.tomarVencidos(en(20), LEASE);
      expect(await cola.confirmarEnvio(primero!.id, primero!.version)).toBe(
        true,
      );
      await encolar(cola, mensaje("w2", 21));
      expect(await cola.tomarVencidos(en(40), LEASE)).toEqual([]);
      const retomados = await cola.tomarVencidos(en(90), LEASE);
      expect(retomados.map((l) => l.id)).toEqual([primero!.id]);
      expect(retomados[0]?.tomas).toBe(2);
    });
  });
}
