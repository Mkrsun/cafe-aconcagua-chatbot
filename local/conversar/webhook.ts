import { createHmac, randomUUID } from "node:crypto";
import type { OpcionElegible } from "./mostrar.js";

/** Un mensaje entrante como lo manda Meta dentro de `value.messages`. */
export interface MensajeDeMeta {
  readonly id: string;
  readonly from: string;
  readonly type: string;
  readonly [campo: string]: unknown;
}

/** Una ubicación de ejemplo para el despacho (una plaza de Ñuñoa). */
const UBICACION_DE_EJEMPLO = {
  latitude: -33.4569,
  longitude: -70.5973,
  name: "Plaza Ñuñoa",
  address: "Av. Irarrázaval, Ñuñoa, Santiago",
};

const base = (telefono: string, type: string) => ({
  id: `wamid.local-${randomUUID()}`,
  from: telefono,
  type,
});

export const mensajeDeTexto = (
  telefono: string,
  texto: string,
): MensajeDeMeta => ({
  ...base(telefono, "text"),
  text: { body: texto },
});

export function mensajeDeEleccion(
  telefono: string,
  opcion: OpcionElegible,
): MensajeDeMeta {
  const respuesta = {
    id: opcion.id,
    title: opcion.titulo,
    ...(opcion.descripcion ? { description: opcion.descripcion } : {}),
  };
  const interactive =
    opcion.origen === "lista"
      ? { type: "list_reply", list_reply: respuesta }
      : { type: "button_reply", button_reply: respuesta };
  return { ...base(telefono, "interactive"), interactive };
}

export const mensajeDeUbicacion = (telefono: string): MensajeDeMeta => ({
  ...base(telefono, "location"),
  location: UBICACION_DE_EJEMPLO,
});

/** El cuerpo del webhook de Meta y su firma `X-Hub-Signature-256` con el secreto de la app. */
export function webhookFirmado(
  mensajes: readonly MensajeDeMeta[],
  secreto: string,
) {
  const cuerpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: { messaging_product: "whatsapp", messages: mensajes },
          },
        ],
      },
    ],
  });
  const firma = createHmac("sha256", secreto).update(cuerpo).digest("hex");
  return {
    cuerpo,
    encabezados: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${firma}`,
    },
  };
}
