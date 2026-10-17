import {
  DatosInvalidos,
  NoEncontrado,
} from "../../../src/plataforma/errores.js";
import type { ConversacionBandeja } from "../../../src/bandeja/dominio/conversacion.js";
import type { IBandeja } from "../../../src/bandeja/puertos/bandeja.js";
import type { AvisoAlEquipo } from "../../../src/bandeja/index.js";
import type { IClientes } from "../../../src/clientes/puertos/clientes.js";
import { hiloDeConversacion, lineaDeConversacion } from "./mostrar.js";

export interface DepsDeLaBandeja {
  readonly bandeja: IBandeja;
  readonly clientes: IClientes;
  readonly aviso: Pick<AvisoAlEquipo, "olvidar">;
  readonly responder: {
    ejecutar(id: string, texto: unknown, autor: string): Promise<unknown>;
  };
}

export const AYUDA = [
  "pnpm bandeja                          las que esperan a una persona (pausadas y asignadas)",
  "pnpm bandeja todas                    todas las conversaciones",
  "pnpm bandeja ver <id|teléfono>        el hilo completo",
  "pnpm bandeja responder <id|teléfono> --como <nombre> <texto>",
  "pnpm bandeja tomar <id|teléfono> --como <nombre>",
  "pnpm bandeja pausar <id|teléfono> [motivo]",
  "pnpm bandeja reanudar <id|teléfono>   el chatbot vuelve a atender",
  "pnpm bandeja resolver <id|teléfono>   cierra la conversación",
];

/** Saca `--como <nombre>` de los argumentos: quién del equipo actúa. */
function separarComo(args: readonly string[]) {
  const i = args.indexOf("--como");
  if (i < 0) return { resto: [...args], como: undefined };
  const como = args[i + 1]?.trim();
  if (!como) throw new DatosInvalidos("--como necesita un nombre");
  return { resto: args.filter((_, j) => j !== i && j !== i + 1), como };
}

/** Los comandos de la bandeja; cada uno devuelve las líneas que se muestran. */
export async function ejecutarBandeja(
  deps: DepsDeLaBandeja,
  args: readonly string[],
): Promise<string[]> {
  const { resto, como } = separarComo(args);
  const [comando = "pendientes", referencia, ...texto] = resto;
  if (comando === "pendientes" || comando === "todas")
    return listar(deps, comando === "todas");
  if (comando === "ayuda") return AYUDA;
  if (!referencia)
    throw new DatosInvalidos(`falta la conversación: ${AYUDA[2]}`);
  const c = await buscar(deps, referencia);
  const exigirComo = () => {
    if (!como) throw new DatosInvalidos("di quién eres con --como <nombre>");
    return como;
  };
  switch (comando) {
    case "ver":
      return mostrar(deps, c);
    case "responder":
      await deps.responder.ejecutar(c.id, texto.join(" "), exigirComo());
      return ["Mensaje enviado; la conversación queda a tu cargo."];
    case "tomar":
      return confirmar(deps, await deps.bandeja.asignar(c.id, exigirComo()));
    case "pausar": {
      const motivo =
        texto.join(" ").trim() || `Pausada por ${como ?? "el equipo"}`;
      return confirmar(deps, await deps.bandeja.pausar(c.id, motivo));
    }
    case "reanudar":
    case "resolver":
      await deps.aviso.olvidar(c.id);
      return confirmar(deps, await deps.bandeja[comando](c.id));
    default:
      throw new DatosInvalidos(`no conozco «${comando}»:\n${AYUDA.join("\n")}`);
  }
}

async function listar(deps: DepsDeLaBandeja, todas: boolean) {
  const lista = (await deps.bandeja.listar()).filter(
    (c) => todas || c.estado === "pausada" || c.estado === "asignada",
  );
  if (!lista.length)
    return [todas ? "No hay conversaciones." : "Nadie espera a una persona."];
  return Promise.all(
    lista.map(async (c) => lineaDeConversacion(c, await nombreDe(deps, c))),
  );
}

async function buscar(deps: DepsDeLaBandeja, referencia: string) {
  const directa = await deps.bandeja.obtener(referencia);
  if (directa) return directa;
  const cliente = await deps.clientes.porTelefono(referencia);
  const activa = cliente && (await deps.bandeja.obtenerActiva(cliente.id));
  if (!activa) throw new NoEncontrado(`la conversación ${referencia}`);
  return activa;
}

const nombreDe = async (deps: DepsDeLaBandeja, c: ConversacionBandeja) =>
  (await deps.clientes.porId(c.clienteId))?.nombre;

async function mostrar(deps: DepsDeLaBandeja, c: ConversacionBandeja) {
  return hiloDeConversacion(c, await nombreDe(deps, c));
}

async function confirmar(
  deps: DepsDeLaBandeja,
  c: ConversacionBandeja | undefined,
) {
  if (!c) throw new NoEncontrado("la conversación");
  return [lineaDeConversacion(c, await nombreDe(deps, c))];
}
