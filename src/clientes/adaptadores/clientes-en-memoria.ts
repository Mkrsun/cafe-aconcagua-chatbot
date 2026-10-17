import { Conflicto } from "../../plataforma/errores.js";
import type { Cliente } from "../dominio/cliente.js";
import { calzaConBusqueda, tieneTelefono } from "../dominio/busqueda.js";
import type { IClientes } from "../puertos/clientes.js";

/** Los clientes en memoria del proceso: desarrollo y pruebas. */
export class ClientesEnMemoria implements IClientes {
  private readonly clientes = new Map<string, Cliente>();

  constructor(iniciales: readonly Cliente[] = []) {
    for (const c of iniciales) this.clientes.set(c.id, c);
  }

  async porId(id: string) {
    return this.clientes.get(id);
  }

  async porTelefono(telefono: string) {
    return [...this.clientes.values()].find((c) => tieneTelefono(c, telefono));
  }

  async listar(busqueda?: string) {
    return [...this.clientes.values()].filter((c) =>
      calzaConBusqueda(c, busqueda),
    );
  }

  async guardar(cliente: Cliente) {
    const ocupado = [...this.clientes.values()].some(
      (otro) =>
        otro.id !== cliente.id &&
        cliente.telefonos.some((t) => tieneTelefono(otro, t)),
    );
    if (ocupado) throw new Conflicto("telefono-repetido");
    this.clientes.set(cliente.id, cliente);
  }
}
