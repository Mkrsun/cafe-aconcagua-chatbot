import { claveDeRegistro } from "../../plataforma/registros/puerto.js";
import {
  conIntercambio,
  ESTADO_INICIAL,
  type EstadoDelTurno,
} from "../dominio/estado.js";
import { resolverTurno } from "./resolver-turno.js";
import type {
  DepsDelTurno,
  EntradaDelTurno,
  ResultadoDelTurno,
  TurnoEnCurso,
} from "./tipos.js";

const clave = claveDeRegistro;

interface TurnoGuardado {
  readonly resultado: ResultadoDelTurno;
  readonly estado: EstadoDelTurno;
}

/**
 * El Turn Agent: atiende un lote de una conversación bajo su llave. El resultado de cada
 * versión del lote queda en el journal (un lote retomado no vuelve a inferir) y el estado de la
 * conversación solo avanza al `confirmar`, cuando la respuesta salió: una respuesta descartada
 * porque llegó otro mensaje no deja rastro en la memoria.
 */
export class Turno {
  constructor(private readonly deps: DepsDelTurno) {}

  atender(entrada: EntradaDelTurno): Promise<ResultadoDelTurno> {
    const { registros } = this.deps;
    return registros.bajoLlave(
      clave("turno", entrada.conversacionId),
      async () => {
        const previo = await registros.leer<TurnoGuardado>(
          this.delLote(entrada),
        );
        if (previo) return previo.resultado;
        const estado =
          (await registros.leer<EstadoDelTurno>(this.delEstado(entrada))) ??
          ESTADO_INICIAL;
        const t = await this.enCurso(entrada, estado);
        const resultado = await resolverTurno(t);
        const respuesta =
          resultado.texto || `(traspaso: ${resultado.traspaso?.motivo ?? ""})`;
        const nuevo = conIntercambio(t.estado, entrada.texto, respuesta);
        await registros.guardar(this.delLote(entrada), {
          resultado,
          estado: nuevo,
        });
        return resultado;
      },
    );
  }

  /** La respuesta del lote salió: su estado pasa a ser el de la conversación. */
  confirmar(entrada: EntradaDelTurno): Promise<void> {
    const { registros } = this.deps;
    return registros.bajoLlave(
      clave("turno", entrada.conversacionId),
      async () => {
        const guardado = await registros.leer<TurnoGuardado>(
          this.delLote(entrada),
        );
        if (guardado)
          await registros.guardar(this.delEstado(entrada), guardado.estado);
      },
    );
  }

  private delLote = (e: EntradaDelTurno) =>
    clave("resultado-del-turno", e.loteId);
  private delEstado = (e: EntradaDelTurno) =>
    clave("estado-del-turno", e.conversacionId);

  private async enCurso(
    entrada: EntradaDelTurno,
    estado: EstadoDelTurno,
  ): Promise<TurnoEnCurso> {
    const [foto, tarifas, faq] = await Promise.all([
      this.deps.catalogo(),
      this.deps.tarifas(),
      this.deps.faq(),
    ]);
    const ahora = this.deps.reloj();
    return {
      deps: this.deps,
      entrada,
      foto,
      tarifas,
      faq,
      ahora,
      estado,
      inferencias: 0,
    };
  }
}
