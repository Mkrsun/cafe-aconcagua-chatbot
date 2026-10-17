import { describe, expect, it } from "vitest";
import type { MensajeEnviado } from "../../e2e/dobles/graph.js";
import { mostrarMensaje } from "./mostrar.js";

const ANA = "56911112222";
const base = { id: "wamid.1", para: ANA };

describe("cómo la CLI muestra lo que el chatbot responde", () => {
  it("un texto se muestra tal cual y no deja opciones", () => {
    const m: MensajeEnviado = { ...base, tipo: "text", texto: "¡Hola, Ana!" };
    expect(mostrarMensaje(m)).toEqual({
      lineas: ["Chatbot: ¡Hola, Ana!"],
      opciones: [],
    });
  });

  it("los botones salen numerados y se pueden elegir", () => {
    const m: MensajeEnviado = {
      ...base,
      tipo: "interactive",
      texto: "Total: $23.970",
      interactivo: {
        type: "button",
        action: {
          buttons: [
            { reply: { id: "confirmar", title: "Confirmar" } },
            { reply: { id: "cambiar", title: "Cambiar algo" } },
          ],
        },
      },
    };
    expect(mostrarMensaje(m)).toEqual({
      lineas: [
        "Chatbot: Total: $23.970",
        "  1) Confirmar",
        "  2) Cambiar algo",
      ],
      opciones: [
        { origen: "boton", id: "confirmar", titulo: "Confirmar" },
        { origen: "boton", id: "cambiar", titulo: "Cambiar algo" },
      ],
    });
  });

  it("las filas de una lista salen numeradas con su descripción", () => {
    const m: MensajeEnviado = {
      ...base,
      tipo: "interactive",
      texto: "Estos son nuestros Futaleufú:",
      interactivo: {
        type: "list",
        action: {
          sections: [
            {
              rows: [
                {
                  id: "sku:0025",
                  title: "Futaleufú grano",
                  description: "$9.990",
                },
                {
                  id: "sku:0028",
                  title: "Futaleufú molido",
                  description: "$9.990",
                },
              ],
            },
          ],
        },
      },
    };
    const { lineas, opciones } = mostrarMensaje(m);
    expect(lineas).toEqual([
      "Chatbot: Estos son nuestros Futaleufú:",
      "  1) Futaleufú grano · $9.990",
      "  2) Futaleufú molido · $9.990",
    ]);
    expect(opciones[1]).toEqual({
      origen: "lista",
      id: "sku:0028",
      titulo: "Futaleufú molido",
      descripcion: "$9.990",
    });
  });

  it("un enlace muestra su botón, la URL y cómo simular el pago", () => {
    const m: MensajeEnviado = {
      ...base,
      tipo: "interactive",
      texto: "Para pagar, toca el botón:",
      interactivo: {
        type: "cta_url",
        action: {
          parameters: { display_text: "Pagar", url: "https://khipu/pagar/1" },
        },
      },
    };
    const { lineas, opciones } = mostrarMensaje(m);
    expect(lineas).toEqual([
      "Chatbot: Para pagar, toca el botón:",
      "  [Pagar] https://khipu/pagar/1 (escribe /pagar para simular el pago)",
    ]);
    expect(opciones).toEqual([]);
  });

  it("un pedido de ubicación dice cómo compartirla", () => {
    const m: MensajeEnviado = {
      ...base,
      tipo: "interactive",
      texto: "¿Me compartes tu ubicación?",
      interactivo: { type: "location_request_message" },
    };
    expect(mostrarMensaje(m).lineas).toEqual([
      "Chatbot: ¿Me compartes tu ubicación?",
      "  [Enviar ubicación] (escribe /ubicacion para compartir una de ejemplo)",
    ]);
  });

  it("una plantilla muestra su nombre y sus variables", () => {
    const m: MensajeEnviado = {
      ...base,
      tipo: "template",
      plantilla: "payment_received",
      parametros: ["Ana Pérez", "$23.970"],
    };
    expect(mostrarMensaje(m).lineas).toEqual([
      "Chatbot (plantilla payment_received): Ana Pérez · $23.970",
    ]);
  });
});
