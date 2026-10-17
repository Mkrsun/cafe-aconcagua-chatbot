import type { ContenidoInteractivo } from "../dominio/interactivos/contenido.js";
import type { PlantillaSaliente } from "../dominio/plantillas.js";

const interactivo = (interactive: Record<string, unknown>) => ({
  type: "interactive",
  interactive,
});

/** El contenido del dominio como cuerpo de `POST /{phone-number-id}/messages`. */
export function cuerpoDelContenido(
  c: ContenidoInteractivo,
): Record<string, unknown> {
  switch (c.tipo) {
    case "botones":
      return interactivo({
        type: "button",
        body: { text: c.cuerpo },
        action: {
          buttons: c.opciones.map((o) => ({
            type: "reply",
            reply: { id: o.id, title: o.titulo },
          })),
        },
      });
    case "lista":
      return interactivo({
        type: "list",
        body: { text: c.cuerpo },
        action: {
          button: c.boton,
          sections: c.secciones.map((s) => ({
            ...(s.titulo ? { title: s.titulo } : {}),
            rows: s.filas.map((f) => ({
              id: f.id,
              title: f.titulo,
              ...(f.descripcion ? { description: f.descripcion } : {}),
            })),
          })),
        },
      });
    case "enlace":
      return interactivo({
        type: "cta_url",
        body: { text: c.cuerpo },
        action: {
          name: "cta_url",
          parameters: { display_text: c.boton, url: c.url },
        },
      });
    case "pedir-ubicacion":
      return interactivo({
        type: "location_request_message",
        body: { text: c.cuerpo },
        action: { name: "send_location" },
      });
    case "reaccion":
      return {
        type: "reaction",
        reaction: { message_id: c.mensajeId, emoji: c.emoji },
      };
  }
}

/** Una plantilla aprobada con sus parámetros de cuerpo. */
export const cuerpoDeLaPlantilla = (p: PlantillaSaliente) => ({
  type: "template",
  template: {
    name: p.nombre,
    language: { code: p.idioma },
    ...(p.parametros.length
      ? {
          components: [
            {
              type: "body",
              parameters: p.parametros.map((text) => ({ type: "text", text })),
            },
          ],
        }
      : {}),
  },
});
