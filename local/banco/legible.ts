import type { MensajeSaliente } from "../../src/whatsapp/puertos/canal.js";

/** Un mensaje saliente como lo ve el cliente en WhatsApp, en texto: cuerpo, botones y listas. */
export function legible(m: MensajeSaliente): string {
  const c = m.contenido;
  if (!c) return m.texto;
  switch (c.tipo) {
    case "botones":
      return `${c.cuerpo}\n[botones: ${c.opciones.map((o) => o.titulo).join(" | ")}]`;
    case "lista": {
      const filas = c.secciones.flatMap((s) =>
        s.filas.map((f) =>
          f.descripcion ? `${f.titulo} (${f.descripcion})` : f.titulo,
        ),
      );
      return `${c.cuerpo}\n[lista «${c.boton}»: ${filas.join(" | ")}]`;
    }
    case "enlace":
      return `${c.cuerpo}\n[botón «${c.boton}»]`;
    case "reaccion":
      return `[reacción ${c.emoji}]`;
    case "pedir-ubicacion":
      return `${c.cuerpo}\n[pide la ubicación]`;
  }
}
