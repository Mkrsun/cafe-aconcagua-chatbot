import { LimiteDeGastoAlcanzado } from "../../modelo/puertos/modelo.js";
import { zonasVisibles } from "../../catalogo/dominio/despacho/zonas.js";
import { armarContexto } from "../dominio/contexto.js";
import {
  ESQUEMA_DE_DECISION,
  HERRAMIENTA,
  leerDecision,
  type DecisionDelTurno,
} from "../dominio/decision.js";
import { violaciones, type Violacion } from "../dominio/validar-respuesta.js";
import type { TurnoEnCurso } from "./tipos.js";

/** El modelo no entregó una decisión válida en dos intentos: el turno pasa a una persona. */
export class TurnoSinDecision extends Error {
  constructor(readonly causa: string) {
    super(causa);
    this.name = "TurnoSinDecision";
  }
}

const violacionesDe = (t: TurnoEnCurso, d: DecisionDelTurno): Violacion[] => {
  const skus = new Set(t.foto.visibles.map((f) => f.sku));
  const desconocidos = d.changes
    .filter((c) => !skus.has(c.sku))
    .map((c) => c.sku);
  const hayZona = !!(d.despacho.trim() || t.estado.zona);
  return [
    ...violaciones(d.response, { foto: t.foto, hayZona }),
    ...desconocidos.map((sku) => ({
      codigo: "sku_inexistente" as const,
      detalle: `${sku} no está en el catálogo visible`,
    })),
  ];
};

/**
 * Una decisión del modelo con una reparación como máximo: si la primera viola una
 * regla o falla, la segunda recibe las violaciones; si también falla, `TurnoSinDecision`.
 */
export async function inferir(t: TurnoEnCurso): Promise<DecisionDelTurno> {
  let reparar: Violacion[] = [];
  let causa = "";
  for (let intento = 0; intento < 2; intento++) {
    const { system, user } = armarContexto({
      foto: t.foto,
      estado: t.estado,
      cliente: t.entrada.cliente,
      faq: t.faq,
      zonas: zonasVisibles(t.tarifas),
      texto: t.entrada.texto,
      reparar,
    });
    t.inferencias++;
    try {
      const { json } = await t.deps.modelo.completar({
        system,
        user,
        schema: ESQUEMA_DE_DECISION,
        herramienta: HERRAMIENTA,
      });
      const decision = leerDecision(json);
      reparar = violacionesDe(t, decision);
      if (!reparar.length) return decision;
      const codigos = reparar.map((v) => v.codigo).join(", ");
      causa = `La respuesta del modelo no pasó la validación: ${codigos}`;
    } catch (error) {
      if (error instanceof LimiteDeGastoAlcanzado) throw error;
      causa = `El modelo falló: ${(error as Error).message}`;
      reparar = [];
    }
  }
  throw new TurnoSinDecision(causa);
}
