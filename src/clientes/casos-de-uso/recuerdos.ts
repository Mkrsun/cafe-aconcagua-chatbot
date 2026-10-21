import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import {
  conNotas,
  RECUERDO_VACIO,
  sinNota,
  type RecuerdoDelCliente,
} from "../dominio/recuerdo.js";

const clave = (clienteId: string) =>
  claveDeRegistro("recuerdo-del-cliente", clienteId);

/**
 * Lo que el chatbot recuerda de cada cliente entre conversaciones, en los registros duraderos. Lo
 * anota el turno y lo ve o lo borra el equipo con `pnpm bandeja recuerdo|olvidar`.
 */
export class RecuerdosDeClientes {
  constructor(private readonly registros: IRegistros) {}

  async leer(clienteId: string): Promise<RecuerdoDelCliente> {
    return (
      (await this.registros.leer<RecuerdoDelCliente>(clave(clienteId))) ??
      RECUERDO_VACIO
    );
  }

  anotar(
    clienteId: string,
    notas: readonly string[],
    ahora: Date,
  ): Promise<void> {
    return this.cambiar(clienteId, (r) => conNotas(r, notas, ahora));
  }

  olvidar(clienteId: string, numero?: number): Promise<void> {
    return this.cambiar(clienteId, (r) => sinNota(r, numero));
  }

  private cambiar(
    clienteId: string,
    cambio: (r: RecuerdoDelCliente) => RecuerdoDelCliente,
  ) {
    const k = clave(clienteId);
    return this.registros.bajoLlave(k, async () => {
      await this.registros.guardar(k, cambio(await this.leer(clienteId)));
    });
  }
}
