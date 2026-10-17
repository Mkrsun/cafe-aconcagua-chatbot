import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import {
  cambioSobre,
  DOCUMENTO_VACIO,
  MAXIMO_DE_CAMBIOS,
  type AccionSobreEntrada,
  type DocumentoDeFaq,
} from "../dominio/documento.js";
import type { EntradaDeFaq } from "../dominio/entrada.js";

const DOCUMENTO = claveDeRegistro("preguntas-frecuentes", "entradas");
const ESCRITURA = claveDeRegistro("preguntas-frecuentes", "escritura");

export interface Modificacion {
  readonly entradas: readonly EntradaDeFaq[];
  readonly entrada: EntradaDeFaq;
  readonly accion: AccionSobreEntrada;
}

/** El documento de la FAQ en los registros duraderos: se lee entero y se escribe bajo llave. */
export class DocumentoEnRegistros {
  constructor(private readonly registros: IRegistros) {}

  modificar(
    actor: string,
    cambio: (entradas: readonly EntradaDeFaq[]) => Modificacion,
  ): Promise<EntradaDeFaq> {
    return this.registros.bajoLlave(ESCRITURA, async () => {
      const actual = await this.leer();
      const { entradas, entrada, accion } = cambio(actual.entradas);
      const historial = [
        cambioSobre(entrada, accion, actor),
        ...actual.historial,
      ];
      await this.registros.guardar(DOCUMENTO, {
        ...actual,
        entradas,
        historial: historial.slice(0, MAXIMO_DE_CAMBIOS),
      });
      return entrada;
    });
  }

  async leer(): Promise<DocumentoDeFaq> {
    return (
      (await this.registros.leer<DocumentoDeFaq>(DOCUMENTO)) ?? DOCUMENTO_VACIO
    );
  }
}
