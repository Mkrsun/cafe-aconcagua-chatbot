import { describe, expect, it } from "vitest";
import { CanalWhatsApp } from "./canal-whatsapp.js";
import { cuerpoDelMensaje } from "./cuerpo-del-mensaje.js";

const base = { telefono: "56911112222", texto: "hola" };

describe("el cuerpo de Cloud API", () => {
  it("texto, citando el mensaje del cliente", () => {
    expect(cuerpoDelMensaje({ ...base, citando: "wamid.1" })).toEqual({
      type: "text",
      text: { body: "hola" },
      context: { message_id: "wamid.1" },
    });
  });

  it("botones, lista, enlace, pedido de ubicación y reacción", () => {
    const botones = cuerpoDelMensaje({
      ...base,
      contenido: {
        tipo: "botones",
        cuerpo: "¿Así?",
        opciones: [{ id: "confirmar", titulo: "Confirmar" }],
      },
    });
    expect(botones).toEqual({
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "¿Así?" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "confirmar", title: "Confirmar" } },
          ],
        },
      },
    });
    const lista = cuerpoDelMensaje({
      ...base,
      contenido: {
        tipo: "lista",
        cuerpo: "Cafés",
        boton: "Ver",
        secciones: [
          { filas: [{ id: "sku:1", titulo: "Uno", descripcion: "$1.000" }] },
        ],
      },
    });
    expect(lista).toMatchObject({
      interactive: {
        type: "list",
        action: {
          button: "Ver",
          sections: [
            { rows: [{ id: "sku:1", title: "Uno", description: "$1.000" }] },
          ],
        },
      },
    });
    const enlace = cuerpoDelMensaje({
      ...base,
      contenido: {
        tipo: "enlace",
        cuerpo: "Listo",
        boton: "Pagar",
        url: "https://k/1",
      },
    });
    expect(enlace).toMatchObject({
      interactive: {
        type: "cta_url",
        action: {
          name: "cta_url",
          parameters: { display_text: "Pagar", url: "https://k/1" },
        },
      },
    });
    expect(
      cuerpoDelMensaje({
        ...base,
        contenido: { tipo: "pedir-ubicacion", cuerpo: "¿Dónde?" },
      }),
    ).toMatchObject({
      interactive: {
        type: "location_request_message",
        action: { name: "send_location" },
      },
    });
    expect(
      cuerpoDelMensaje({
        ...base,
        contenido: { tipo: "reaccion", mensajeId: "wamid.9", emoji: "👍" },
      }),
    ).toEqual({
      type: "reaction",
      reaction: { message_id: "wamid.9", emoji: "👍" },
    });
  });

  it("la plantilla manda sobre el contenido; un contenido inválido sale como texto", () => {
    const conPlantilla = cuerpoDelMensaje({
      ...base,
      plantilla: {
        nombre: "payment_received",
        idioma: "es",
        parametros: ["Ana", "$1"],
      },
      contenido: { tipo: "pedir-ubicacion", cuerpo: "x" },
    });
    expect(conPlantilla).toEqual({
      type: "template",
      template: {
        name: "payment_received",
        language: { code: "es" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Ana" },
              { type: "text", text: "$1" },
            ],
          },
        ],
      },
    });
    const invalido = cuerpoDelMensaje({
      ...base,
      contenido: { tipo: "botones", cuerpo: "x", opciones: [] },
    });
    expect(invalido).toEqual({ type: "text", text: { body: "hola" } });
  });
});

describe("CanalWhatsApp (Graph con fetch falso)", () => {
  function canal(respuesta: Response) {
    const pedidos: { url: string; cuerpo: unknown }[] = [];
    const fetch = async (url: string | URL | Request, init?: RequestInit) => {
      pedidos.push({
        url: String(url),
        cuerpo: JSON.parse(String(init?.body)),
      });
      return respuesta;
    };
    return {
      pedidos,
      canal: new CanalWhatsApp(
        "token",
        "123",
        "https://graph.prueba/v25.0",
        fetch,
      ),
    };
  }

  it("envía y devuelve el id del proveedor", async () => {
    const { canal: c, pedidos } = canal(
      Response.json({ messages: [{ id: "wamid.out" }] }),
    );
    expect(await c.enviar(base)).toEqual({
      enviado: true,
      idDelProveedor: "wamid.out",
    });
    expect(pedidos[0]).toEqual({
      url: "https://graph.prueba/v25.0/123/messages",
      cuerpo: {
        messaging_product: "whatsapp",
        to: "56911112222",
        type: "text",
        text: { body: "hola" },
      },
    });
  });

  it("un rechazo trae el código de Meta (131047: fuera de la ventana)", async () => {
    const { canal: c } = canal(
      Response.json(
        { error: { message: "Re-engagement", code: 131047 } },
        { status: 400 },
      ),
    );
    expect(await c.enviar(base)).toEqual({
      enviado: false,
      error: "Re-engagement",
      codigoError: 131047,
    });
  });

  it("marca leído con «escribiendo…»", async () => {
    const { canal: c, pedidos } = canal(Response.json({ success: true }));
    await c.marcarLeido("wamid.in", { escribiendo: true });
    expect(pedidos[0]?.cuerpo).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.in",
      typing_indicator: { type: "text" },
    });
  });
});
