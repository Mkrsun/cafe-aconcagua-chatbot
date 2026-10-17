/** Lo que `pnpm local` imprime cuando todo está arriba: dónde mirar y qué hacer después. */
export function bienvenida(d: {
  dobles: string;
  simulador: string;
  modelo: string;
}): string {
  return [
    "",
    "Café Aconcagua está corriendo en modo local.",
    `  Simulador:        ${d.simulador} (se abre en el navegador)`,
    `  Modelo:           ${d.modelo} (real, con tu OPENAI_API_KEY)`,
    `  WhatsApp y Khipu: dobles en ${d.dobles} (no sale ningún mensaje ni cobro real)`,
    "",
    "En el simulador escribes como cliente y atiendes como el equipo, con el gasto a la vista.",
    "Si prefieres la terminal: pnpm conversar (cliente) y pnpm bandeja (equipo).",
    "Ctrl+C cierra todo.",
    "",
  ].join("\n");
}
