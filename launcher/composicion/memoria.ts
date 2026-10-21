import { RecuerdosDeClientes } from "../../src/clientes/index.js";
import { pedidosAnteriores } from "../../src/pedidos/index.js";
import type { Reloj } from "../../src/plataforma/reloj.js";
import type { DepsDelTurno } from "../../src/turno/casos-de-uso/tipos.js";
import type { Almacenes } from "./almacenes.js";

/** La memoria del turno: las notas del CRM y los últimos pedidos del cliente, sin montos. */
export function memoriaDelCliente(
  a: Almacenes,
  reloj: Reloj,
): DepsDelTurno["memoria"] {
  const recuerdos = new RecuerdosDeClientes(a.registros);
  return {
    async leer(clienteId) {
      const [recuerdo, pedidos] = await Promise.all([
        recuerdos.leer(clienteId),
        pedidosAnteriores(a.pedidos, clienteId),
      ]);
      return {
        notas: recuerdo.notas.map((n) => n.texto),
        pedidosAnteriores: pedidos,
      };
    },
    anotar: (clienteId, notas) => recuerdos.anotar(clienteId, notas, reloj()),
  };
}
