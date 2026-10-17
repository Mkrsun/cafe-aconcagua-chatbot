import { describe, expect, it } from "vitest";
import type { MensajeEnviado } from "../../e2e/dobles/graph.js";
import { armarHilo, type MensajeDelCliente } from "./hilo.js";

const ANA = "56911112222";
const t = (s: number) => `2026-10-16T12:00:${String(s).padStart(2, "0")}.000Z`;
const delCliente = (
  id: string,
  texto: string,
  s: number,
): MensajeDelCliente => ({
  id,
  texto,
  en: t(s),
});
const deCafe = (m: Partial<MensajeEnviado>, s: number): MensajeEnviado => ({
  id: `wamid.${s}`,
  para: ANA,
  tipo: "text",
  en: t(s),
  ...m,
});

describe("el hilo del simulador", () => {
  it("intercala lo del cliente y lo de Café por hora", () => {
    const { mensajes } = armarHilo(
      [delCliente("c1", "hola", 1), delCliente("c2", "¿qué cafés tienen?", 2)],
      [deCafe({ texto: "¡Hola!" }, 5)],
      [],
    );
    expect(mensajes.map((m) => [m.de, m.texto])).toEqual([
      ["cliente", "hola"],
      ["cliente", "¿qué cafés tienen?"],
      ["cafe", "¡Hola!"],
    ]);
  });

  it("los botones, la lista, el enlace de pago y la plantilla quedan listos para dibujar", () => {
    const { mensajes } = armarHilo(
      [],
      [
        deCafe(
          {
            texto: "Paga aquí",
            interactivo: {
              type: "cta_url",
              action: {
                parameters: { display_text: "Pagar", url: "https://k/1" },
              },
            },
          },
          1,
        ),
        deCafe(
          { plantilla: "payment_received", parametros: ["Ana", "$9.990"] },
          2,
        ),
        deCafe(
          {
            texto: "¿Lo dejamos así?",
            interactivo: {
              type: "button",
              action: {
                buttons: [{ reply: { id: "confirmar", title: "Confirmar" } }],
              },
            },
          },
          3,
        ),
      ],
      [],
    );
    expect(mensajes[0]?.enlace).toEqual({ texto: "Pagar", url: "https://k/1" });
    expect(mensajes[1]).toMatchObject({
      texto: "Plantilla payment_received: Ana · $9.990",
    });
    expect(mensajes[2]?.opciones).toEqual([
      { origen: "boton", id: "confirmar", titulo: "Confirmar" },
    ]);
  });

  it("solo el último mensaje de Café deja elegir sus opciones", () => {
    const boton = {
      type: "button",
      action: { buttons: [{ reply: { id: "si", title: "Sí" } }] },
    };
    const { mensajes } = armarHilo(
      [],
      [
        deCafe({ texto: "a", interactivo: boton }, 1),
        deCafe({ texto: "b" }, 2),
      ],
      [],
    );
    expect(mensajes[0]?.opciones).toEqual([]);
  });

  it("dice si el chatbot está esperando o escribiendo la respuesta", () => {
    const cliente = [delCliente("c1", "hola", 1)];
    expect(armarHilo(cliente, [], []).estado).toBe("esperando");
    expect(
      armarHilo(cliente, [], [{ mensajeId: "c1", escribiendo: true }]).estado,
    ).toBe("escribiendo");
    expect(
      armarHilo(cliente, [deCafe({ texto: "¡Hola!" }, 3)], []).estado,
    ).toBe("libre");
  });
});
