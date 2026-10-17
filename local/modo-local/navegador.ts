import { spawn } from "node:child_process";

const COMANDOS: Record<string, [string, string[]]> = {
  darwin: ["open", []],
  win32: ["cmd", ["/c", "start", ""]],
};

/**
 * Abre la página en el navegador de quien prueba. Solo en una terminal de verdad y sin
 * `CAFE_SIN_NAVEGADOR`: las pruebas y los servidores no abren ventanas. Si falla, la dirección
 * ya quedó impresa.
 */
export function abrirNavegador(url: string, env = process.env) {
  if (!process.stdout.isTTY || env.CAFE_SIN_NAVEGADOR) return;
  const [comando, args] = COMANDOS[process.platform] ?? ["xdg-open", []];
  try {
    const proceso = spawn(comando, [...args, url], {
      stdio: "ignore",
      detached: true,
    });
    proceso.on("error", () => undefined);
    proceso.unref();
  } catch {
    // Sin navegador a mano: queda la dirección impresa.
  }
}
