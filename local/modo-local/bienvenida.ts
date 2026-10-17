/** Lo que `pnpm local` imprime cuando todo está arriba: dónde mirar y qué hacer después. */
export function bienvenida(d: { dobles: string; modelo: string }): string {
  return [
    "",
    "Café Aconcagua está corriendo en modo local.",
    `  Modelo:           ${d.modelo} (real, con tu OPENAI_API_KEY)`,
    `  WhatsApp y Khipu: dobles en ${d.dobles} (no sale ningún mensaje ni cobro real)`,
    "",
    "Para conversar como cliente, en otra terminal: pnpm conversar",
    "  (o pnpm conversar --cliente mayorista)",
    "Para atender como el equipo: pnpm bandeja (pnpm bandeja ayuda muestra los comandos)",
    "Ctrl+C cierra todo.",
    "",
  ].join("\n");
}
