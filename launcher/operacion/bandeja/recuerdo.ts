import {
  DatosInvalidos,
  NoEncontrado,
} from "../../../src/plataforma/errores.js";
import type { RecuerdosDeClientes } from "../../../src/clientes/index.js";
import type { IClientes } from "../../../src/clientes/puertos/clientes.js";

export interface DepsDelRecuerdo {
  readonly clientes: IClientes;
  readonly recuerdos: RecuerdosDeClientes;
}

/**
 * `recuerdo <teléfono>` y `olvidar <teléfono> [número]`: el equipo ve y borra lo que el chatbot
 * anotó del cliente, porque es lo que el modelo lee en cada conversación.
 */
export async function ejecutarRecuerdo(
  deps: DepsDelRecuerdo,
  comando: "recuerdo" | "olvidar",
  telefono: string,
  numero?: string,
): Promise<string[]> {
  const cliente = await deps.clientes.porTelefono(telefono);
  if (!cliente) throw new NoEncontrado(`el cliente ${telefono}`);
  const quien = `${cliente.nombre} (${telefono})`;
  if (comando === "olvidar") {
    if (numero === undefined) {
      await deps.recuerdos.olvidar(cliente.id);
      return ["Olvidé todo lo que recordaba."];
    }
    const n = Number(numero);
    const notas = (await deps.recuerdos.leer(cliente.id)).notas;
    if (!Number.isSafeInteger(n) || n < 1 || n > notas.length)
      throw new DatosInvalidos(
        `no hay una nota ${numero}: mira «recuerdo ${telefono}»`,
      );
    await deps.recuerdos.olvidar(cliente.id, n);
    return [`Olvidé la nota ${n}.`];
  }
  const { notas } = await deps.recuerdos.leer(cliente.id);
  if (!notas.length) return [`El chatbot no recuerda nada de ${quien}.`];
  return [
    `Lo que el chatbot recuerda de ${quien}:`,
    ...notas.map((nota, i) => `  ${i + 1}. ${nota.texto}`),
  ];
}
