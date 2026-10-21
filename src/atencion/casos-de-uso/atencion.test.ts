import { describe, expect, it } from "vitest";
import { decision } from "../../turno/test-support/mundo-del-turno.js";
import {
  CLIENTE,
  EQUIPO,
  mundoDeAtencion,
} from "../test-support/mundo-de-atencion.js";

const responde = (response: string) => async () => decision({ response });

describe("atender WhatsApp con espera humana", () => {
  it("una ráfaga de cuatro mensajes recibe UNA respuesta que los lee todos, en orden", async () => {
    const m = mundoDeAtencion(responde("¡Hola! Te ayudo con eso."));
    expect(
      await m.recibir.ejecutar([
        m.texto("hola buenas"),
        m.texto("Necesito 7 bolsas de café"),
      ]),
    ).toBe(true);
    m.reloj.avanzar(5_000);
    await m.recibir.ejecutar([
      m.texto("5 cerro alegre"),
      m.texto("¿Cuándo llega el despacho? Gracias"),
    ]);
    m.reloj.avanzar(5_000);
    expect(await m.despachar.ejecutar()).toBe(0);
    expect(m.modelo.llamadas).toHaveLength(0);
    m.reloj.avanzar(5_000);
    expect(await m.despachar.ejecutar()).toBe(1);
    expect(m.modelo.llamadas).toHaveLength(1);
    expect(JSON.parse(m.modelo.llamadas[0]!.user).mensaje).toBe(
      "hola buenas\nNecesito 7 bolsas de café\n5 cerro alegre\n¿Cuándo llega el despacho? Gracias",
    );
    expect(m.canal.a(CLIENTE)).toEqual([
      { telefono: CLIENTE, texto: "¡Hola! Te ayudo con eso." },
    ]);
    expect(m.canal.leidos).toEqual(["wamid.4"]);
    const conv = (await m.bandeja.listar())[0]!;
    expect(conv.mensajes.map((x) => x.autor)).toEqual([
      "cliente",
      "cliente",
      "cliente",
      "cliente",
      "chatbot",
    ]);
  });

  it("un reintento de Meta con el mismo mensaje no se atiende dos veces", async () => {
    const m = mundoDeAtencion(responde("Hola"));
    const evento = m.texto("hola, ¿tienen café molido?");
    await m.recibir.ejecutar([evento]);
    await m.recibir.ejecutar([evento]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.modelo.llamadas).toHaveLength(1);
    expect((await m.bandeja.listar())[0]?.mensajes).toHaveLength(2);
  });

  it("lo que llega mientras el chatbot genera se suma y se responde una sola vez", async () => {
    const m = mundoDeAtencion(async () => decision({ response: "primera" }));
    m.modelo.responder = async () => {
      m.modelo.responder = async () => decision({ response: "con todo junto" });
      await m.recibir.ejecutar([m.texto("y también molido.")]);
      return decision({ response: "primera" });
    };
    await m.recibir.ejecutar([m.texto("Quiero café en grano.")]);
    m.reloj.avanzar(30_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(CLIENTE)).toEqual([]);
    m.reloj.avanzar(30_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(CLIENTE).map((x) => x.texto)).toEqual(["con todo junto"]);
    expect(JSON.parse(m.modelo.llamadas[1]!.user).mensaje).toBe(
      "Quiero café en grano.\ny también molido.",
    );
  });

  it("si una persona la tomó mientras el chatbot esperaba, el chatbot no responde", async () => {
    const m = mundoDeAtencion(responde("no debería"));
    await m.recibir.ejecutar([m.texto("Necesito café para mi tienda.")]);
    const conv = (await m.bandeja.listar())[0]!;
    await m.bandeja.asignar(conv.id, "Glei");
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.modelo.llamadas).toHaveLength(0);
    expect(m.canal.a(CLIENTE)).toEqual([]);
  });

  it("un audio recibe un acuse sin inferir; una reacción no se encola", async () => {
    const m = mundoDeAtencion(responde("no debería"));
    await m.recibir.ejecutar([
      { id: "wamid.a", telefono: CLIENTE, tipo: "audio" },
    ]);
    await m.recibir.ejecutar([
      {
        id: "wamid.r",
        telefono: CLIENTE,
        tipo: "reaction",
        entrante: { tipo: "reaccion", mensajeId: "wamid.out.1", emoji: "👍" },
      },
    ]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.modelo.llamadas).toHaveLength(0);
    expect(m.canal.a(CLIENTE).map((x) => x.texto)).toEqual([
      "¡Gracias por el audio! Por ahora no puedo escucharlos; ¿me lo escribes, porfa?",
    ]);
    const textos = (await m.bandeja.listar())[0]!.mensajes.map((x) => x.texto);
    expect(textos).toContain("[reacción] 👍");
  });

  it("un desconocido recibe un acuse al día y el equipo se entera", async () => {
    const m = mundoDeAtencion(responde("no debería"));
    await m.recibir.ejecutar([m.texto("hola, ¿venden café?", "56977778888")]);
    await m.recibir.ejecutar([m.texto("¿hola?", "56977778888")]);
    expect(m.canal.a("56977778888")).toHaveLength(1);
    expect(m.canal.a(EQUIPO)).toHaveLength(1);
    expect(m.modelo.llamadas).toHaveLength(0);
  });

  it("si el aviso al equipo no sale, al desconocido no se le promete y se reintenta", async () => {
    const m = mundoDeAtencion(responde("no debería"));
    m.canal.fallar = (x) =>
      x.telefono === EQUIPO
        ? { enviado: false, error: "Meta lo rechazó" }
        : undefined;
    await m.recibir.ejecutar([m.texto("hola, ¿venden café?", "56977778888")]);
    const [acuse] = m.canal.a("56977778888");
    expect(acuse?.texto).not.toContain("Le dejé tu mensaje al equipo");
    expect(acuse?.texto).toContain("vuelve a escribirnos");
    m.canal.fallar = () => undefined;
    await m.recibir.ejecutar([m.texto("¿hola?", "56977778888")]);
    expect(m.canal.a(EQUIPO)).toHaveLength(1);
    expect(m.canal.a("56977778888").at(-1)?.texto).toContain(
      "Le dejé tu mensaje al equipo",
    );
  });
});

describe("derivación y reclamos en el canal", () => {
  it("pedir una persona avisa al equipo, lo dice al cliente y pausa", async () => {
    const m = mundoDeAtencion(responde("no debería"));
    await m.recibir.ejecutar([m.texto("quiero hablar con una persona.")]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(EQUIPO)[0]?.plantilla?.parametros).toEqual([
      "Emporio Uno (56911112222)",
      "El cliente pidió hablar con una persona",
      expect.stringContaining("quiero hablar con una persona"),
    ]);
    expect(m.canal.a(CLIENTE)[0]?.texto).toContain(
      "te escribe por aquí en un ratito",
    );
    expect((await m.bandeja.listar())[0]).toMatchObject({ estado: "pausada" });
    await m.recibir.ejecutar([m.texto("¿hola?")]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(CLIENTE)).toHaveLength(1);
    expect(m.canal.a(EQUIPO)).toHaveLength(1);
  });

  it("un reclamo tranquilo se responde y se registra sin pausar, con aviso", async () => {
    const m = mundoDeAtencion(async () =>
      decision({
        intent: "reclamo",
        response: "¡Qué pena! ¿Me mandas una foto?",
      }),
    );
    await m.recibir.ejecutar([m.texto("me llegó el café vencido.")]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(CLIENTE)[0]?.texto).toBe(
      "¡Qué pena! ¿Me mandas una foto?",
    );
    expect((await m.bandeja.listar())[0]).toMatchObject({
      estado: "abierta",
      motivoHandoff: "Reclamo registrado por el chatbot",
    });
    expect(m.canal.a(EQUIPO)).toHaveLength(1);
  });

  it("un envío fallido se reintenta sin reinferir; si falla siempre, carta muerta", async () => {
    const m = mundoDeAtencion(responde("Hola"));
    let fallas = 1;
    m.canal.fallar = () =>
      fallas-- > 0 ? { enviado: false, error: "caído" } : undefined;
    await m.recibir.ejecutar([m.texto("hola, necesito café.")]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(m.canal.a(CLIENTE)).toHaveLength(1);
    expect(m.modelo.llamadas).toHaveLength(1);
    m.canal.fallar = () => ({ enviado: false, error: "caído" });
    await m.recibir.ejecutar([m.texto("¿sigues ahí?")]);
    m.reloj.avanzar(60_000);
    await m.despachar.ejecutar();
    expect(await m.entrantes.cartasMuertas()).toHaveLength(1);
  });
});
