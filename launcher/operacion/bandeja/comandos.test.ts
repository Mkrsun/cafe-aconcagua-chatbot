import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EMPORIO } from "../../../src/carga/test-support/negocio-de-prueba.js";
import { decision } from "../../../src/turno/test-support/mundo-del-turno.js";
import {
  aplicacionDePrueba,
  EQUIPO,
  SECRETO_DE_META,
} from "../../composicion/aplicacion-de-prueba.js";
import { RecuerdosDeClientes } from "../../../src/clientes/index.js";
import { ejecutarBandeja } from "./comandos.js";

const TELEFONO = EMPORIO.telefonos[0]!;

/** Emporio pide una persona: la conversación queda pausada esperando al equipo. */
async function conUnTraspaso() {
  const m = await aplicacionDePrueba(() => decision({ response: "no" }));
  await m.configurarElNegocio();
  const cuerpo = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "wamid.in.1",
                  from: TELEFONO,
                  type: "text",
                  text: { body: "quiero hablar con una persona" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  const firma = createHmac("sha256", SECRETO_DE_META)
    .update(cuerpo)
    .digest("hex");
  await m.app.request("/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": `sha256=${firma}` },
    body: cuerpo,
  });
  m.reloj.avanzar(60_000);
  await m.trabajos.despachar();
  const bandeja = (args: string[]) =>
    ejecutarBandeja(
      {
        bandeja: m.almacenes.bandeja,
        clientes: m.almacenes.clientes,
        aviso: m.servicios.aviso,
        responder: m.servicios.responderDesdeBandeja,
        recuerdos: new RecuerdosDeClientes(m.almacenes.registros),
      },
      args,
    );
  return { ...m, bandeja };
}

describe("pnpm bandeja", () => {
  it("lista las que esperan a una persona, con el motivo", async () => {
    const m = await conUnTraspaso();
    const [linea, ...otras] = await m.bandeja([]);
    expect(otras).toEqual([]);
    expect(linea).toContain("[pausada]");
    expect(linea).toContain(`Emporio Dos (${TELEFONO})`);
    expect(linea).toContain("El cliente pidió hablar con una persona");
  });

  it("muestra el hilo buscando por teléfono", async () => {
    const m = await conUnTraspaso();
    const hilo = await m.bandeja(["ver", TELEFONO]);
    expect(hilo.join("\n")).toContain("Cliente: quiero hablar con una persona");
    expect(hilo.join("\n")).toContain("Chatbot: Claro, con gusto");
  });

  it("responder envía por WhatsApp y deja la conversación a cargo de quien respondió", async () => {
    const m = await conUnTraspaso();
    await m.bandeja([
      "responder",
      TELEFONO,
      "--como",
      "Glei",
      "Hola,",
      "te",
      "llamo",
    ]);
    expect(m.canal.a(TELEFONO).at(-1)?.texto).toBe("Hola, te llamo");
    const [conversacion] = await m.almacenes.bandeja.listar();
    expect(conversacion).toMatchObject({
      estado: "asignada",
      propietario: "Glei",
    });
  });

  it("responder sin decir quién eres no envía nada", async () => {
    const m = await conUnTraspaso();
    const antes = m.canal.a(TELEFONO).length;
    await expect(m.bandeja(["responder", TELEFONO, "hola"])).rejects.toThrow(
      /--como/,
    );
    expect(m.canal.a(TELEFONO)).toHaveLength(antes);
  });

  it("reanudar devuelve la conversación al chatbot", async () => {
    const m = await conUnTraspaso();
    const [linea] = await m.bandeja(["reanudar", TELEFONO]);
    expect(linea).toContain("[abierta]");
    expect(m.canal.a(EQUIPO)).toHaveLength(1);
    expect(await m.bandeja([])).toEqual(["Nadie espera a una persona."]);
  });

  it("resolver cierra la conversación", async () => {
    const m = await conUnTraspaso();
    const [linea] = await m.bandeja(["resolver", TELEFONO]);
    expect(linea).toContain("[resuelta]");
  });

  it("una conversación que no existe se dice en simple", async () => {
    const m = await conUnTraspaso();
    await expect(m.bandeja(["ver", "56900000000"])).rejects.toThrow(
      /no existe/,
    );
  });
  it("muestra lo que el chatbot recuerda del cliente y lo olvida por número o entero", async () => {
    const m = await conUnTraspaso();
    const cliente = await m.almacenes.clientes.porTelefono(TELEFONO);
    const recuerdos = new RecuerdosDeClientes(m.almacenes.registros);
    await recuerdos.anotar(
      cliente!.id,
      ["Almacén en Recoleta", "Prefiere grano"],
      new Date(),
    );
    expect(await m.bandeja(["recuerdo", TELEFONO])).toEqual([
      `Lo que el chatbot recuerda de Emporio Dos (${TELEFONO}):`,
      "  1. Almacén en Recoleta",
      "  2. Prefiere grano",
    ]);
    expect(await m.bandeja(["olvidar", TELEFONO, "1"])).toEqual([
      "Olvidé la nota 1.",
    ]);
    expect(await m.bandeja(["olvidar", TELEFONO])).toEqual([
      "Olvidé todo lo que recordaba.",
    ]);
    expect(await m.bandeja(["recuerdo", TELEFONO])).toEqual([
      `El chatbot no recuerda nada de Emporio Dos (${TELEFONO}).`,
    ]);
  });
});
