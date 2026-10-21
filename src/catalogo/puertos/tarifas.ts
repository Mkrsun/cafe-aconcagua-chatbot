import type { EventoDeAuditoria } from "../dominio/auditoria.js";
import type {
  DatosDeTarifa,
  TarifaDeDespacho,
} from "../dominio/despacho/tarifa.js";

/**
 * Las tarifas de despacho por zona (borde: PostgreSQL). Real: `TarifasPostgres` · fake:
 * `TarifasEnMemoria`. La revisión es un entero que sube en cada escritura.
 */
export interface ITarifasDeDespacho {
  listar(): Promise<readonly TarifaDeDespacho[]>;
  crear(datos: DatosDeTarifa, actor: string): Promise<TarifaDeDespacho>;
  actualizar(
    id: string,
    datos: DatosDeTarifa,
    revisionEsperada: unknown,
    actor: string,
  ): Promise<TarifaDeDespacho>;
  eliminar(id: string, revisionEsperada: unknown, actor: string): Promise<void>;
  auditoria(): Promise<readonly EventoDeAuditoria[]>;
}
