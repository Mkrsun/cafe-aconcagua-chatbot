import { describe, expect, it } from "vitest";
import type { IBandeja } from "../puertos/bandeja.js";

/** Los mensajes llegaron hace una hora: lo que la bandeja hace después (pausar) es más nuevo. */
const HACE_UNA_HORA = Date.now() - 3_600_000;
const t = (s: number) => new Date(HACE_UNA_HORA + s * 1000);
const deCliente = (texto: string, s: number, clienteId = "cli_1") => ({
  clienteId,
  telefono: "56911112222",
  texto,
  ahora: t(s),
});

/** El contrato de la bandeja: lo pasan la memoria y PostgreSQL. */
export function contratoDeLaBandeja(crear: () => Promise<IBandeja>) {
  describe("contrato de la bandeja", () => {
    it("una conversación activa por cliente, con sus mensajes en orden", async () => {
      const bandeja = await crear();
      const a = await bandeja.registrarCliente(deCliente("hola", 0));
      const b = await bandeja.registrarCliente(deCliente("necesito café", 1));
      expect(b.id).toBe(a.id);
      expect(b).toMatchObject({
        estado: "abierta",
        canal: "whatsapp",
        telefono: "56911112222",
      });
      await bandeja.registrarChatbot(a.id, "¡Hola! ¿Qué café buscas?", t(2), {
        tipo: "botones",
        cuerpo: "x",
        opciones: [{ id: "op:1", titulo: "Uno" }],
      });
      const c = await bandeja.obtener(a.id);
      expect(c?.mensajes.map((m) => [m.autor, m.texto])).toEqual([
        ["cliente", "hola"],
        ["cliente", "necesito café"],
        ["chatbot", "¡Hola! ¿Qué café buscas?"],
      ]);
      expect(c?.mensajes[2]?.interactivo?.tipo).toBe("botones");
      expect((await bandeja.obtenerActiva("cli_1"))?.id).toBe(a.id);
    });

    it("pausar guarda motivo y resumen; reanudar los limpia", async () => {
      const bandeja = await crear();
      const { id } = await bandeja.registrarCliente(
        deCliente("quiero hablar con alguien", 0),
      );
      await bandeja.pausar(
        id,
        "Pidió una persona",
        "Cliente pidió una persona.\nRetomar.",
      );
      expect(await bandeja.obtener(id)).toMatchObject({
        estado: "pausada",
        motivoHandoff: "Pidió una persona",
        resumenHandoff: "Cliente pidió una persona.\nRetomar.",
      });
      const reanudada = await bandeja.reanudar(id);
      expect(reanudada).toMatchObject({ estado: "abierta" });
      expect(reanudada?.motivoHandoff).toBeUndefined();
    });

    it("un reclamo se registra sin pausar; las fotos quedan marcadas", async () => {
      const bandeja = await crear();
      const { id } = await bandeja.registrarCliente(deCliente("llegó roto", 0));
      await bandeja.registrarReclamo(id, {
        motivo: "Reclamo registrado por el chatbot",
        resumen: "Llegó roto.",
      });
      await bandeja.registrarReclamo(id, { imagenes: 1 });
      expect(await bandeja.obtener(id)).toMatchObject({
        estado: "abierta",
        motivoHandoff: "Reclamo registrado por el chatbot",
        resumenHandoff: "Llegó roto. · Adjuntó fotos (en la bandeja).",
      });
    });

    it("escribir asigna; resolver cierra y el próximo mensaje abre otra", async () => {
      const bandeja = await crear();
      const { id } = await bandeja.registrarCliente(deCliente("hola", 0));
      const humano = await bandeja.registrarHumano(
        id,
        "Hola, soy Glei",
        "Glei",
        t(1),
      );
      expect(humano).toMatchObject({ estado: "asignada", propietario: "Glei" });
      expect(humano.mensajes.at(-1)).toMatchObject({
        autor: "humano",
        autorNombre: "Glei",
      });
      await bandeja.resolver(id);
      expect(await bandeja.obtenerActiva("cli_1")).toBeUndefined();
      const nueva = await bandeja.registrarCliente(deCliente("otra vez", 5));
      expect(nueva.id).not.toBe(id);
    });

    it("lista la más reciente primero y filtra por estado", async () => {
      const bandeja = await crear();
      const a = await bandeja.registrarCliente(deCliente("uno", 0, "cli_1"));
      const b = await bandeja.registrarCliente(deCliente("dos", 1, "cli_2"));
      await bandeja.pausar(a.id, "motivo", "resumen");
      expect((await bandeja.listar()).map((c) => c.id)).toEqual([a.id, b.id]);
      expect((await bandeja.listar("abierta")).map((c) => c.id)).toEqual([
        b.id,
      ]);
      expect(await bandeja.asignar(b.id, "Rodo")).toMatchObject({
        estado: "asignada",
        propietario: "Rodo",
      });
    });
  });
}
