import { describe, expect, it } from "vitest";
import { extraerEventos } from "./eventos-de-meta.js";

const payload = (...mensajes: object[]) => ({
  entry: [
    { changes: [{ value: { messages: mensajes, statuses: [{ id: "x" }] } }] },
  ],
});
const de = (id: string, extra: object) => ({
  id,
  from: "56911112222",
  ...extra,
});

describe("los mensajes de Meta como eventos", () => {
  it("texto, con la cita si respondió citando", () => {
    expect(
      extraerEventos(
        payload(
          de("w1", {
            type: "text",
            text: { body: "hola" },
            context: { id: "w0" },
          }),
        ),
      ),
    ).toEqual([
      {
        id: "w1",
        telefono: "56911112222",
        tipo: "text",
        texto: "hola",
        citaA: "w0",
      },
    ]);
  });

  it("respuestas a botones, listas y botones de plantilla son elecciones", () => {
    const eventos = extraerEventos(
      payload(
        de("b1", {
          type: "interactive",
          interactive: {
            type: "button_reply",
            button_reply: { id: "confirmar", title: "Confirmar" },
          },
        }),
        de("l1", {
          type: "interactive",
          interactive: {
            type: "list_reply",
            list_reply: {
              id: "sku:0025",
              title: "Futaleufú",
              description: "$9.990",
            },
          },
        }),
        de("p1", { type: "button", button: { payload: "si", text: "Sí" } }),
      ),
    );
    expect(eventos.map((e) => [e.tipo, e.entrante])).toEqual([
      [
        "interactive",
        {
          tipo: "eleccion",
          origen: "boton",
          eleccion: { id: "confirmar", titulo: "Confirmar" },
        },
      ],
      [
        "interactive",
        {
          tipo: "eleccion",
          origen: "lista",
          eleccion: {
            id: "sku:0025",
            titulo: "Futaleufú",
            descripcion: "$9.990",
          },
        },
      ],
      [
        "interactive",
        {
          tipo: "eleccion",
          origen: "boton",
          eleccion: { id: "si", titulo: "Sí" },
        },
      ],
    ]);
  });

  it("ubicación, reacción e imagen con leyenda; lo de sistema se ignora", () => {
    const eventos = extraerEventos(
      payload(
        de("u1", {
          type: "location",
          location: { latitude: -33.45, longitude: -70.6, name: "Casa" },
        }),
        de("r1", {
          type: "reaction",
          reaction: { message_id: "wamid.out", emoji: "👍" },
        }),
        de("i1", {
          type: "image",
          image: { id: "media1", caption: "así llegó" },
        }),
        de("a1", { type: "audio", audio: { id: "media2" } }),
        de("s1", { type: "system", system: {} }),
      ),
    );
    expect(eventos.map((e) => e.tipo)).toEqual([
      "location",
      "reaction",
      "image",
      "audio",
    ]);
    expect(eventos[0]?.entrante).toEqual({
      tipo: "ubicacion",
      ubicacion: { latitud: -33.45, longitud: -70.6, nombre: "Casa" },
    });
    expect(eventos[1]?.entrante).toEqual({
      tipo: "reaccion",
      mensajeId: "wamid.out",
      emoji: "👍",
    });
    expect(eventos[2]).toMatchObject({ tipo: "image", texto: "así llegó" });
  });

  it("un payload sin mensajes no trae eventos", () => {
    expect(
      extraerEventos({ entry: [{ changes: [{ value: { statuses: [] } }] }] }),
    ).toEqual([]);
    expect(extraerEventos("basura")).toEqual([]);
  });
});
