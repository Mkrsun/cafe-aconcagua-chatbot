import type { EventoDeAuditoria } from "../dominio/auditoria.js";
import type { FormatoEditable, PrecioEditable } from "../dominio/formato.js";
import type { Tramo } from "../dominio/tramos.js";
import type {
  CambiosDeFormato,
  FormatoNuevo,
} from "../dominio/validar-formato.js";

/**
 * El catálogo editable (borde: PostgreSQL). Cada escritura trae la revisión que vio quien escribe
 * y deja un evento de auditoría con el actor. Real: `CatalogoPostgres` · fake: `CatalogoEnMemoria`.
 */
export interface ICatalogoEditable {
  /** Los formatos vigentes (no archivados), con sus precios por tramo. */
  listar(): Promise<readonly FormatoEditable[]>;
  /** Un SKU archivado vuelve con los datos nuevos y los precios pendientes; uno vigente choca. */
  crear(nuevo: FormatoNuevo, actor: string): Promise<FormatoEditable>;
  actualizar(
    sku: string,
    cambios: CambiosDeFormato,
    revisionEsperada: unknown,
    actor: string,
  ): Promise<FormatoEditable>;
  archivar(
    sku: string,
    revisionEsperada: unknown,
    actor: string,
  ): Promise<void>;
  fijarPrecio(
    sku: string,
    tramo: Tramo,
    montoClp: number | null,
    revisionEsperada: unknown,
    actor: string,
  ): Promise<PrecioEditable>;
  /** Los últimos cambios, el más nuevo primero. */
  auditoria(): Promise<readonly EventoDeAuditoria[]>;
}
