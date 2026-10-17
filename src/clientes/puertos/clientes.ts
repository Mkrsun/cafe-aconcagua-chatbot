import type { Cliente } from "../dominio/cliente.js";
import type {
  CambioDePolitica,
  PoliticaDeContacto,
} from "../dominio/politica.js";

/**
 * Los clientes del CRM (borde: PostgreSQL, esquema `cafe`). Real: `ClientesPostgres` · fake:
 * `ClientesEnMemoria`. Un teléfono pertenece a un solo cliente (`Conflicto("telefono-repetido")`).
 */
export interface IClientes {
  porId(id: string): Promise<Cliente | undefined>;
  /** Acepta el teléfono en cualquier formato. */
  porTelefono(telefono: string): Promise<Cliente | undefined>;
  /** Todos, o los que calzan por nombre o teléfono. */
  listar(busqueda?: string): Promise<readonly Cliente[]>;
  guardar(cliente: Cliente): Promise<void>;
}

/** La política de contacto de cada cliente. Real: `PoliticasPostgres` · fake: en memoria. */
export interface IPoliticasDeContacto {
  /** Sin política guardada, la de por defecto (consentimiento desconocido). */
  de(clienteId: string): Promise<PoliticaDeContacto>;
  guardar(
    clienteId: string,
    politica: PoliticaDeContacto,
    actor: string,
  ): Promise<void>;
  /** Los cambios de consentimiento, el más nuevo primero. */
  historial(clienteId: string): Promise<readonly CambioDePolitica[]>;
}
