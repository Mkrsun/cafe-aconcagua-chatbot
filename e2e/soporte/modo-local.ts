import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { ejecutarSemilla } from "../../local/semilla/ejecutar.js";
import { crearModelo } from "../dobles/modelo.js";
import { iniciarDobles } from "../dobles/servidor.js";
import { baseNueva, borrarBase } from "./base-de-datos.js";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

const puertoLibre = () =>
  new Promise<number>((listo) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => listo(port));
    });
  });

async function esperar(salida: () => string, patron: RegExp) {
  const limite = Date.now() + 45_000;
  while (!patron.test(salida())) {
    if (Date.now() > limite)
      throw new Error(`pnpm local no arrancó:\n${salida()}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * `pnpm local` de verdad, como lo corre Rodo: su base con la semilla y el modelo guionado (el
 * único doble extra; WhatsApp y Khipu son los del propio modo local). Esperas cortas.
 */
export async function arrancarModoLocal(sufijo: string) {
  const modelo = await iniciarDobles({ dobles: [crearModelo()] });
  const base = await baseNueva(sufijo);
  await ejecutarSemilla({ DATABASE_URL: base });
  const [servidor, dobles] = [await puertoLibre(), await puertoLibre()];
  const proceso = spawn(
    process.execPath,
    ["--import", "tsx", "local/modo-local/main.ts"],
    {
      cwd: RAIZ,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        DATABASE_URL: base,
        OPENAI_API_KEY: "sk-e2e",
        CAFE_MODELO_BASE_URL: `${modelo.base}/llm/v1`,
        CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,0.1,4",
        CAFE_PUERTO: String(servidor),
        CAFE_DOBLES_PUERTO: String(dobles),
        CAFE_SIN_NAVEGADOR: "1",
        CAFE_VENTANA_AGRUPACION_MS: "1500",
        CAFE_ESPERA_CIERRE_MS: "800",
        CAFE_ESPERA_INCOMPLETA_MS: "2500",
        CAFE_TECHO_AGRUPACION_MS: "10000",
        CAFE_DESPACHO_CADA_MS: "200",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let salida = "";
  proceso.stdout.on("data", (d: Buffer) => (salida += d.toString()));
  proceso.stderr.on("data", (d: Buffer) => (salida += d.toString()));
  await esperar(() => salida, /Simulador:/);
  return {
    simulador: `http://127.0.0.1:${dobles}/`,
    modelo: modelo.base,
    salida: () => salida,
    cerrar: async () => {
      await new Promise<void>((listo) => {
        if (proceso.exitCode !== null) return listo();
        proceso.once("exit", () => listo());
        proceso.kill("SIGTERM");
      });
      await modelo.cerrar();
      await borrarBase(base);
    },
  };
}
