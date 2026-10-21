import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { PerfilDeCafe } from "../dominio/perfil.js";

const DOCUMENTO = claveDeRegistro("catalogo", "perfiles-de-cafe");

/**
 * Las notas de cata de los cafés: un documento en los registros duraderos (como la FAQ), porque
 * se leen enteras en cada turno y solo las cambia `pnpm cargar`.
 */
export class PerfilesDeCafe {
  constructor(private readonly registros: IRegistros) {}

  async leer(): Promise<readonly PerfilDeCafe[]> {
    const doc = await this.registros.leer<{ perfiles: PerfilDeCafe[] }>(
      DOCUMENTO,
    );
    return doc?.perfiles ?? [];
  }

  reemplazar(perfiles: readonly PerfilDeCafe[]): Promise<void> {
    return this.registros.guardar(DOCUMENTO, { perfiles });
  }
}
