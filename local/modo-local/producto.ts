import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

async function esperarSalud(url: string, termino: () => boolean) {
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    if (termino())
      throw new Error(
        "El servidor se detuvo al arrancar (mira arriba por qué).",
      );
    const ok = await fetch(`${url}/salud`)
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`El servidor no respondió en ${url} después de 60 s.`);
}

/** El producto real (`launcher/main.ts`) en su propio proceso, con su salida en esta terminal. */
export async function arrancarProducto(
  env: Record<string, string>,
  url: string,
) {
  const proceso = spawn(
    process.execPath,
    ["--import", "tsx", "launcher/main.ts"],
    {
      cwd: RAIZ,
      env,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  await esperarSalud(url, () => proceso.exitCode !== null);
  return {
    detenido: new Promise<number | null>((listo) =>
      proceso.once("exit", listo),
    ),
    cerrar: () =>
      new Promise<void>((cerrado) => {
        if (proceso.exitCode !== null) return cerrado();
        proceso.once("exit", () => cerrado());
        proceso.kill("SIGTERM");
      }),
  };
}
