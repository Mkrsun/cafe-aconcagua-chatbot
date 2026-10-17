import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { crearModelo } from "../../e2e/dobles/modelo.js";
import { iniciarDobles, type Dobles } from "../../e2e/dobles/servidor.js";
import { decision } from "../../e2e/soporte/decisiones.js";
import { describirConPostgres } from "../../src/plataforma/test-support/base-de-pruebas.js";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import { ejecutarSemilla } from "../semilla/ejecutar.js";
import { basePropia, borrarBasePropia } from "../test-support/base-propia.js";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const ANA = CLIENTES_DE_EJEMPLO.minorista;

const puertoLibre = () =>
  new Promise<number>((listo) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => listo(port));
    });
  });

/** Un proceso de `local/` con su salida acumulada, para esperar lo que imprime. */
function lanzar(script: string, env: Record<string, string>) {
  const proceso = spawn(process.execPath, ["--import", "tsx", script], {
    cwd: RAIZ,
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
  });
  let salida = "";
  proceso.stdout.on("data", (d: Buffer) => (salida += d.toString()));
  proceso.stderr.on("data", (d: Buffer) => (salida += d.toString()));
  return { proceso, salida: () => salida };
}

async function esperarTexto(salida: () => string, patron: RegExp, ms = 30_000) {
  const limite = Date.now() + ms;
  while (!patron.test(salida())) {
    if (Date.now() > limite)
      throw new Error(`no apareció ${patron} en:\n${salida()}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const terminar = (p: ChildProcessWithoutNullStreams) =>
  new Promise<void>((listo) => {
    if (p.exitCode !== null) return listo();
    p.once("exit", () => listo());
    p.kill("SIGINT");
  });

describirConPostgres("modo local con un modelo de prueba", () => {
  let url: string;
  let modelo: Dobles;
  let local: ReturnType<typeof lanzar>;
  const puertos = { servidor: "", dobles: "" };

  beforeAll(async () => {
    url = await basePropia("modo_local");
    await ejecutarSemilla({ DATABASE_URL: url });
    modelo = await iniciarDobles({ dobles: [crearModelo()] });
    puertos.servidor = String(await puertoLibre());
    puertos.dobles = String(await puertoLibre());
    local = lanzar("local/modo-local/main.ts", {
      DATABASE_URL: url,
      OPENAI_API_KEY: "sk-prueba",
      CAFE_MODELO_BASE_URL: `${modelo.base}/llm/v1`,
      CAFE_PUERTO: puertos.servidor,
      CAFE_DOBLES_PUERTO: puertos.dobles,
      CAFE_VENTANA_AGRUPACION_MS: "1500",
      CAFE_ESPERA_CIERRE_MS: "800",
      CAFE_ESPERA_INCOMPLETA_MS: "2500",
      CAFE_TECHO_AGRUPACION_MS: "10000",
      CAFE_DESPACHO_CADA_MS: "200",
    });
    await esperarTexto(local.salida, /pnpm conversar/);
  }, 60_000);

  afterAll(async () => {
    if (local) await terminar(local.proceso);
    await modelo?.cerrar();
    if (url) await borrarBasePropia(url);
  });

  it("dice cómo conversar como cliente y cómo atender como el equipo", () => {
    expect(local.salida()).toContain("pnpm conversar");
    expect(local.salida()).toContain("pnpm bandeja");
    expect(local.salida()).not.toMatch(/admin/i);
  });

  it("sirve el simulador web: la página, los clientes de la semilla y su estado", async () => {
    const base = `http://127.0.0.1:${puertos.dobles}`;
    expect(local.salida()).toContain(`http://localhost:${puertos.dobles}/`);
    expect(await (await fetch(`${base}/`)).text()).toContain(
      "Teléfono del cliente",
    );
    const clientes = await (
      await fetch(`${base}/simulador/api/clientes`)
    ).json();
    expect(clientes.map((c: { nombre: string }) => c.nombre)).toContain(
      ANA.nombre,
    );
    const estado = await (
      await fetch(`${base}/simulador/api/estado?telefono=${ANA.telefono}`)
    ).json();
    expect(estado).toMatchObject({ estado: "libre", bandeja: [] });
    expect(estado.gasto).toMatchObject({ llamadas: 0 });
  });

  it("la CLI manda una ráfaga y recibe una sola respuesta con sus opciones", async () => {
    await fetch(`${modelo.base}/__dobles/modelo/guion`, {
      method: "POST",
      body: JSON.stringify({
        cliente: ANA.nombre,
        decisiones: [
          decision({
            knownRefs: ["0025", "0028"],
            forma: { tipo: "lista", opciones: [], skus: ["0025", "0028"] },
            response: "¡Hola, Ana! Estos son nuestros Futaleufú:",
          }),
        ],
      }),
    });
    const cli = lanzar("local/conversar/main.ts", {
      CAFE_PUERTO: puertos.servidor,
      CAFE_DOBLES_PUERTO: puertos.dobles,
    });
    // Pegada apenas abre la CLI, antes de su saludo: ninguna línea se pierde.
    cli.proceso.stdin.write("hola buenas\nquiero café para Ñuñoa\n");
    cli.proceso.stdin.write("¿qué futaleufú tienen?\n");

    await esperarTexto(cli.salida, /2\) Futaleufú/);
    expect(cli.salida()).toContain("Escribes como Ana Pérez");
    await new Promise((r) => setTimeout(r, 3000));
    const salida = cli.salida();
    expect(salida).toContain("El chatbot espera a que termines de escribir");
    expect(salida).toContain("El chatbot está escribiendo");
    expect(salida.match(/^Chatbot: /gm)).toHaveLength(1);
    expect(salida).toContain(
      "Chatbot: ¡Hola, Ana! Estos son nuestros Futaleufú:",
    );
    expect(salida).toMatch(/1\) Futaleufú .*\$9\.990/);
    const llamadas = await (
      await fetch(`${modelo.base}/__dobles/modelo/llamadas`)
    ).json();
    expect(llamadas).toEqual([
      {
        cliente: ANA.nombre,
        mensaje: "hola buenas\nquiero café para Ñuñoa\n¿qué futaleufú tienen?",
      },
    ]);

    const fin = new Promise((listo) => cli.proceso.once("exit", listo));
    cli.proceso.stdin.write("/salir\n");
    expect(await fin).toBe(0);
  }, 60_000);
});
