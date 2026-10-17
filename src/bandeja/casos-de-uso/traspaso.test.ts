import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RelojFalso } from "../../plataforma/reloj-falso.js";
import { CanalEnMemoria } from "../../whatsapp/adaptadores/canal-en-memoria.js";
import { BandejaEnMemoria } from "../adaptadores/bandeja-en-memoria.js";
import { AvisoAlEquipo } from "./aviso-al-equipo.js";
import { SostenerLaPausa } from "./sostener-la-pausa.js";
import { Traspasar } from "./traspasar.js";

async function mundo(numeros = ["56900000001"]) {
  const canal = new CanalEnMemoria();
  const reloj = new RelojFalso(new Date("2026-10-16T12:00:00.000Z"));
  const registros = new RegistrosEnMemoria();
  const bandeja = new BandejaEnMemoria();
  const aviso = new AvisoAlEquipo({
    canal,
    registros,
    numeros,
    plantilla: { nombre: "handoff_alert", idioma: "es" },
    reloj: reloj.ahora,
  });
  const conversacion = await bandeja.registrarCliente({
    clienteId: "cli_1",
    telefono: "56911112222",
    texto: "quiero hablar con una persona",
    ahora: reloj.ahora(),
  });
  const deps = {
    bandeja,
    aviso,
    rol: "la encargada",
    registros,
    reloj: reloj.ahora,
  };
  return { canal, reloj, bandeja, aviso, conversacion, deps };
}

const pedido = {
  cliente: "Emporio Uno",
  tipo: "caso" as const,
  motivo: "El cliente pidió hablar con una persona",
  resumen: "Pidió una persona.\nRetomar.",
};

describe("traspasar a una persona", () => {
  it("avisa primero, promete «en un ratito» solo si salió y pausa la conversación", async () => {
    const { bandeja, conversacion, deps, canal } = await mundo();
    const texto = await new Traspasar(deps).ejecutar({
      conversacion,
      ...pedido,
    });
    expect(texto).toContain("te escribe por aquí en un ratito");
    expect(canal.enviados).toHaveLength(1);
    expect(await bandeja.obtener(conversacion.id)).toMatchObject({
      estado: "pausada",
      motivoHandoff: pedido.motivo,
      resumenHandoff: pedido.resumen,
    });
  });

  it("sin aviso es honesto y no promete el ratito", async () => {
    const { conversacion, deps } = await mundo([]);
    const texto = await new Traspasar(deps).ejecutar({
      conversacion,
      ...pedido,
    });
    expect(texto).toContain("te va a contactar por este mismo chat");
  });
});

describe("la pausa se sostiene", () => {
  it("si el aviso había fallado, el siguiente mensaje lo reintenta sin contestar", async () => {
    const { conversacion, deps, canal, bandeja } = await mundo();
    canal.fallar = () => ({ enviado: false, error: "caído" });
    await new Traspasar(deps).ejecutar({ conversacion, ...pedido });
    canal.fallar = () => undefined;
    const pausada = (await bandeja.obtener(conversacion.id))!;
    expect(
      await new SostenerLaPausa(deps).ejecutar(pausada, "Emporio Uno"),
    ).toBeUndefined();
    expect(canal.enviados).toHaveLength(1);
  });

  it("si el aviso sigue sin salir, un solo acuse cada 6 h", async () => {
    const { conversacion, deps, canal, bandeja, reloj } = await mundo();
    canal.fallar = () => ({ enviado: false, error: "caído" });
    await new Traspasar(deps).ejecutar({ conversacion, ...pedido });
    const pausada = (await bandeja.obtener(conversacion.id))!;
    const sostener = new SostenerLaPausa(deps);
    expect(await sostener.ejecutar(pausada, "Emporio Uno")).toContain(
      "lo dejé anotado",
    );
    expect(await sostener.ejecutar(pausada, "Emporio Uno")).toBeUndefined();
    reloj.avanzar(6 * 3_600_000);
    expect(await sostener.ejecutar(pausada, "Emporio Uno")).toContain(
      "lo dejé anotado",
    );
  });
});
