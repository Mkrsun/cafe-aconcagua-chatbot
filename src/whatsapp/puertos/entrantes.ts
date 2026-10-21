/** Un mensaje que no se pudo atender: queda para revisarlo (`cafe.cartas_muertas`). */
export interface CartaMuerta {
  readonly mensajeId: string;
  readonly datos: unknown;
  readonly error: string;
  readonly en?: string;
}

/**
 * El registro de entrantes (borde: PostgreSQL): reclamo idempotente por id de Meta y cartas
 * muertas. Real: `EntrantesPostgres` · fake: `EntrantesEnMemoria`.
 */
export interface IEntrantes {
  /** `true` si este proceso lo tomó; un reclamo vencido (el proceso murió) se puede retomar. */
  reclamar(mensajeId: string): Promise<boolean>;
  soltar(mensajeId: string): Promise<void>;
  marcarProcesado(mensajeId: string): Promise<void>;
  cartaMuerta(carta: CartaMuerta): Promise<void>;
  cartasMuertas(): Promise<readonly CartaMuerta[]>;
}
