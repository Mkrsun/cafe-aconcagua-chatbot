import { describe, expect, it } from "vitest";
import { Conflicto } from "../../plataforma/errores.js";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { CanalEnMemoria } from "../../whatsapp/adaptadores/canal-en-memoria.js";
import { claveUltimoEntranteDeCliente } from "../../whatsapp/dominio/ventana.js";
import { BandejaEnMemoria } from "../adaptadores/bandeja-en-memoria.js";
import { ResponderDesdeBandeja } from "./responder-desde-bandeja.js";

async function mundo(ultimoEntrante?: string) {
  const canal = new CanalEnMemoria();
  const registros = new RegistrosEnMemoria();
  const bandeja = new BandejaEnMemoria();
  const ahora = () => new Date("2026-10-16T12:00:00.000Z");
  const conv = await bandeja.registrarCliente({
    clienteId: "cli_1",
    telefono: "56911112222",
    texto: "hola",
    ahora: ahora(),
  });
  if (ultimoEntrante)
    await registros.guardar(claveUltimoEntranteDeCliente("cli_1"), {
      at: ultimoEntrante,
    });
  const responder = new ResponderDesdeBandeja({
    bandeja,
    canal,
    registros,
    reloj: ahora,
  });
  return { canal, bandeja, conv, responder };
}

describe("responder desde la bandeja", () => {
  it("dentro de la ventana envía y asigna la conversación a quien responde", async () => {
    const { canal, conv, responder } = await mundo("2026-10-16T10:00:00.000Z");
    const r = await responder.ejecutar(conv.id, "Hola, soy Glei", "Glei");
    expect(canal.enviados).toEqual([
      { telefono: "56911112222", texto: "Hola, soy Glei" },
    ]);
    expect(r).toMatchObject({ estado: "asignada", propietario: "Glei" });
  });

  it("fuera de la ventana no se puede (solo plantillas)", async () => {
    const { canal, conv, responder } = await mundo("2026-10-14T10:00:00.000Z");
    await expect(responder.ejecutar(conv.id, "Hola", "Glei")).rejects.toThrow(
      Conflicto,
    );
    expect(canal.enviados).toEqual([]);
  });

  it("si WhatsApp no lo acepta, no queda como enviado", async () => {
    const { canal, conv, responder, bandeja } = await mundo(
      "2026-10-16T10:00:00.000Z",
    );
    canal.fallar = () => ({ enviado: false, error: "caído" });
    await expect(responder.ejecutar(conv.id, "Hola", "Glei")).rejects.toThrow(
      /no-enviado/,
    );
    expect((await bandeja.obtener(conv.id))?.mensajes).toHaveLength(1);
  });
});
