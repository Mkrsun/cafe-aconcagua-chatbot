import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RelojFalso } from "../../plataforma/reloj-falso.js";
import { CanalEnMemoria } from "../../whatsapp/adaptadores/canal-en-memoria.js";
import { claveUltimoEntranteDeTelefono } from "../../whatsapp/dominio/ventana.js";
import { AvisoAlEquipo } from "./aviso-al-equipo.js";

const traspaso = {
  tipo: "traspaso" as const,
  cliente: "Emporio Uno (56911112222)",
  motivo: "El cliente pidió hablar con una persona",
  resumen: "Pidió una persona.\nRetomar el pedido de 7 bolsas.",
  conversacionId: "conv_1",
};

function mundo(opciones: { plantilla?: boolean; numeros?: string[] } = {}) {
  const canal = new CanalEnMemoria();
  const registros = new RegistrosEnMemoria();
  const reloj = new RelojFalso(new Date("2026-10-16T12:00:00.000Z"));
  const aviso = new AvisoAlEquipo({
    canal,
    registros,
    numeros: opciones.numeros ?? ["56900000001", "56900000002"],
    ...(opciones.plantilla === false
      ? {}
      : { plantilla: { nombre: "handoff_alert", idioma: "es" } }),
    reloj: reloj.ahora,
  });
  return { canal, registros, reloj, aviso };
}

describe("el aviso al equipo", () => {
  it("con plantilla avisa a cada número con cliente, motivo y resumen", async () => {
    const { canal, aviso } = mundo();
    expect(await aviso.notificar(traspaso)).toBe(true);
    expect(canal.enviados).toHaveLength(2);
    expect(canal.enviados[0]?.plantilla).toEqual({
      nombre: "handoff_alert",
      idioma: "es",
      parametros: [
        "Emporio Uno (56911112222)",
        "El cliente pidió hablar con una persona",
        "Pidió una persona. Retomar el pedido de 7 bolsas.",
      ],
    });
  });

  it("sin plantilla, texto libre solo a quien escribió en las últimas 24 h", async () => {
    const { canal, aviso, registros } = mundo({ plantilla: false });
    expect(await aviso.notificar(traspaso)).toBe(false);
    await registros.guardar(claveUltimoEntranteDeTelefono("56900000002"), {
      at: "2026-10-16T08:00:00.000Z",
    });
    expect(await aviso.notificar(traspaso)).toBe(true);
    expect(canal.enviados.map((m) => m.telefono)).toEqual(["56900000002"]);
    expect(canal.enviados[0]?.texto).toContain(
      "Motivo: El cliente pidió hablar con una persona",
    );
  });

  it("un aviso por episodio; el de reclamo no calla al traspaso; olvidar reabre", async () => {
    const { canal, aviso } = mundo({ numeros: ["56900000001"] });
    await aviso.notificar({ ...traspaso, tipo: "reclamo" });
    expect(await aviso.notificar(traspaso)).toBe(true);
    expect(await aviso.notificar(traspaso)).toBe(true);
    expect(canal.enviados).toHaveLength(2);
    await aviso.olvidar("conv_1");
    await aviso.notificar(traspaso);
    expect(canal.enviados).toHaveLength(3);
  });

  it("nunca lanza: sin números o con el canal caído no queda registrado", async () => {
    expect(await mundo({ numeros: [] }).aviso.notificar(traspaso)).toBe(false);
    const { canal, aviso } = mundo();
    canal.fallar = () => ({ enviado: false, error: "caído" });
    expect(await aviso.notificar(traspaso)).toBe(false);
    expect(await aviso.notificar(traspaso)).toBe(false);
  });
});
