import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

export const SECRETO_DE_META = "secreto-de-la-app-de-meta-e2e";
export const EQUIPO = "56900000001";

const puertoLibre = () =>
  new Promise<number>((listo, fallo) => {
    const s = createServer();
    s.once("error", fallo);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => listo(port));
    });
  });

/** El entorno del producto: dobles en los bordes, esperas cortas y nada heredado del que corre. */
const entorno = (puerto: number, baseDeDatos: string, dobles: string) => ({
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  CAFE_ENV: "desarrollo",
  CAFE_PUERTO: String(puerto),
  DATABASE_URL: baseDeDatos,
  OPENAI_API_KEY: "sk-e2e",
  CAFE_MODELO_BASE_URL: `${dobles}/llm/v1`,
  CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,0.1,4",
  META_ACCESS_TOKEN: "token-e2e",
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_VERIFY_TOKEN: "verificar",
  WHATSAPP_APP_SECRET: SECRETO_DE_META,
  META_GRAPH_BASE_URL: `${dobles}/graph`,
  WHATSAPP_PAYMENT_TEMPLATE: "payment_received",
  WHATSAPP_HANDOFF_TEMPLATE: "handoff_alert",
  CAFE_EQUIPO_WHATSAPP: EQUIPO,
  KHIPU_API_KEY: "khipu-e2e",
  KHIPU_BASE_URL: `${dobles}/khipu/v3`,
  CAFE_VENTANA_AGRUPACION_MS: "1500",
  CAFE_ESPERA_CIERRE_MS: "800",
  CAFE_ESPERA_INCOMPLETA_MS: "2500",
  CAFE_TECHO_AGRUPACION_MS: "10000",
  CAFE_DESPACHO_CADA_MS: "200",
});

async function esperarSalud(url: string, salida: () => string) {
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    const ok = await fetch(`${url}/salud`)
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`El servidor no arrancó en 30 s:\n${salida()}`);
}

/** `pnpm bandeja …` con el mismo entorno del servidor, como lo corre el equipo. */
function correrBandeja(args: string[], env: Record<string, string>) {
  const proceso = spawn(
    process.execPath,
    ["--import", "tsx", "launcher/bandeja.ts", ...args],
    { cwd: RAIZ, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let salida = "";
  proceso.stdout.on("data", (d: Buffer) => (salida += d.toString()));
  proceso.stderr.on("data", (d: Buffer) => (salida += d.toString()));
  return new Promise<{ codigo: number | null; salida: string }>((listo) =>
    proceso.once("exit", (codigo) => listo({ codigo, salida })),
  );
}

/** El producto real (`launcher/main.ts`) en su propio proceso, con su base y los dobles. */
export async function arrancarServidor(baseDeDatos: string, dobles: string) {
  const puerto = await puertoLibre();
  const proceso = spawn(
    process.execPath,
    ["--import", "tsx", "launcher/main.ts"],
    {
      cwd: RAIZ,
      env: entorno(puerto, baseDeDatos, dobles),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let salida = "";
  proceso.stdout.on("data", (d: Buffer) => (salida += d.toString()));
  proceso.stderr.on("data", (d: Buffer) => (salida += d.toString()));
  const url = `http://127.0.0.1:${puerto}`;
  await esperarSalud(url, () => salida);
  return {
    url,
    salida: () => salida,
    bandeja: (args: string[]) =>
      correrBandeja(args, entorno(puerto, baseDeDatos, dobles)),
    cerrar: () =>
      new Promise<void>((cerrado) => {
        if (proceso.exitCode !== null) return cerrado();
        proceso.once("exit", () => cerrado());
        proceso.kill("SIGTERM");
      }),
  };
}
