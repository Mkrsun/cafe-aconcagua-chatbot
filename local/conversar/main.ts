import { clearLine, createInterface, cursorTo } from "node:readline";
import { parseArgs } from "node:util";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import {
  direccionesLocales,
  SECRETO_DE_DESARROLLO,
} from "../entorno-de-desarrollo.js";
import { ChatbotLocal } from "./chatbot-local.js";
import { Conversacion } from "./conversacion.js";
import { saludo } from "./textos.js";

const REVISAR_CADA_MS = 400;

function clienteElegido() {
  const { values } = parseArgs({
    options: { cliente: { type: "string", default: "minorista" } },
  });
  const tipo = values.cliente;
  if (tipo !== "minorista" && tipo !== "mayorista")
    throw new Error("--cliente debe ser minorista o mayorista");
  return CLIENTES_DE_EJEMPLO[tipo];
}

/** `pnpm conversar`: el teléfono del cliente de la semilla, en la terminal. */
async function main() {
  const cliente = clienteElegido();
  const { servidor, dobles } = direccionesLocales(process.env);
  const chatbot = new ChatbotLocal(servidor, dobles, SECRETO_DE_DESARROLLO);
  if (!(await chatbot.disponible()))
    throw new Error(
      `No encuentro el modo local en ${servidor}. ¿Corriste pnpm local en otra terminal?`,
    );
  const salida = process.stdout;
  // Entre abrir la terminal y escuchar sus líneas no puede haber esperas: se perdería lo pegado.
  const conversacion = new Conversacion(chatbot, cliente, (l) => escribir(l));
  await conversacion.empezar();
  const rl = createInterface({
    input: process.stdin,
    output: salida,
    prompt: "Tú: ",
  });
  const preguntar = () => salida.isTTY && rl.prompt(true);
  const escribir = (linea: string) => {
    if (salida.isTTY) (clearLine(salida, 0), cursorTo(salida, 0));
    console.log(linea);
    preguntar();
  };
  saludo(cliente).forEach((l) => console.log(l));
  preguntar();

  let revisando = false;
  const revisor = setInterval(() => {
    if (revisando) return;
    revisando = true;
    conversacion
      .revisar()
      .catch(() => undefined)
      .finally(() => (revisando = false));
  }, REVISAR_CADA_MS);

  // Las líneas se mandan en orden, una tras otra, sin esperar la respuesta del chatbot.
  let cola = Promise.resolve(true);
  rl.on("line", (linea) => {
    cola = cola.then(async (seguir) => {
      if (!seguir) return false;
      const sigue = await conversacion.atender(linea).catch((e: Error) => {
        escribir(
          `(No pude mandar el mensaje: ${e.message}. ¿Sigue corriendo pnpm local?)`,
        );
        return true;
      });
      if (sigue) preguntar();
      else rl.close();
      return sigue;
    });
  });
  rl.on("close", () => {
    clearInterval(revisor);
    console.log("Hasta pronto.");
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
