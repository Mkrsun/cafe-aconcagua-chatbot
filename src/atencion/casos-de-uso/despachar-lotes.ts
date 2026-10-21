import type { Reloj } from "../../plataforma/reloj.js";
import type { IColaDeEntrantes } from "../../whatsapp/puertos/cola.js";
import type { ResponderLote } from "./responder-lote.js";

/** Lease de un lote tomado: vencido, otra réplica lo retoma. */
const LEASE_MS = 5 * 60_000;

/**
 * El trabajo recurrente del despachador: toma los lotes vencidos (con exclusión entre
 * réplicas) y los responde de a uno. Un lote que falla no detiene a los demás.
 */
export class DespacharLotes {
  constructor(
    private readonly deps: {
      readonly cola: IColaDeEntrantes;
      readonly responder: ResponderLote;
      readonly reloj: Reloj;
    },
  ) {}

  async ejecutar(): Promise<number> {
    const lotes = await this.deps.cola.tomarVencidos(this.deps.reloj(), {
      leaseMs: LEASE_MS,
      limite: 10,
    });
    for (const lote of lotes)
      await this.deps.responder
        .ejecutar(lote)
        .catch((error: unknown) =>
          console.error(`el lote ${lote.id} falló`, error),
        );
    return lotes.length;
  }
}
