import { createHmac } from "node:crypto";
import { SECRETO_DE_META } from "./servidor-cafe.js";

let n = 0;
const id = () => `wamid.in.e2e-${Date.now()}-${++n}`;

/** Lo que manda Meta al webhook, firmado con el secreto de la app como lo hace Meta. */
async function webhook(url: string, mensajes: object[]) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { messages: mensajes } }] }],
  });
  const firma = createHmac("sha256", SECRETO_DE_META)
    .update(cuerpo)
    .digest("hex");
  const r = await fetch(`${url}/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${firma}`,
    },
    body: cuerpo,
  });
  if (!r.ok) throw new Error(`el webhook respondió ${r.status}`);
}

/** Un cliente que escribe por WhatsApp: textos sueltos (en ráfaga) y elecciones interactivas. */
export function clienteEnWhatsApp(url: string, telefono: string) {
  return {
    escribir: async (...textos: string[]) => {
      for (const body of textos)
        await webhook(url, [
          { id: id(), from: telefono, type: "text", text: { body } },
        ]);
    },
    elegirBoton: (botonId: string, titulo: string) =>
      webhook(url, [
        {
          id: id(),
          from: telefono,
          type: "interactive",
          interactive: {
            type: "button_reply",
            button_reply: { id: botonId, title: titulo },
          },
        },
      ]),
    elegirDeLista: (filaId: string, titulo: string, descripcion?: string) =>
      webhook(url, [
        {
          id: id(),
          from: telefono,
          type: "interactive",
          interactive: {
            type: "list_reply",
            list_reply: {
              id: filaId,
              title: titulo,
              ...(descripcion ? { description: descripcion } : {}),
            },
          },
        },
      ]),
  };
}
