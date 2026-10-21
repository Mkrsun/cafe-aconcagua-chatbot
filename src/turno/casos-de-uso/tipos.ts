import type { IRegistros } from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import type { TarifaDeDespacho } from "../../catalogo/dominio/despacho/tarifa.js";
import type { FotoDelCatalogo } from "../../catalogo/dominio/precio.js";
import type { PerfilDeCafe } from "../../catalogo/index.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import type { IModelo } from "../../modelo/puertos/modelo.js";
import type { PedidoNuevo } from "../../pedidos/dominio/pedido.js";
import type { ContenidoInteractivo } from "../../whatsapp/dominio/interactivos/contenido.js";
import type { EstadoDelTurno } from "../dominio/estado.js";
import type { PedidoDeTraspaso } from "../dominio/traspasos.js";

export interface DepsDelTurno {
  /** Detrás del límite de gasto: con el límite alcanzado lanza `LimiteDeGastoAlcanzado`. */
  readonly modelo: IModelo;
  readonly registros: IRegistros;
  readonly catalogo: () => Promise<FotoDelCatalogo>;
  readonly tarifas: () => Promise<readonly TarifaDeDespacho[]>;
  /** Solo las publicadas. */
  readonly faq: () => Promise<
    readonly { pregunta: string; respuesta: string }[]
  >;
  /** Las notas de cata de cada café (las carga `pnpm cargar`). */
  readonly perfiles: () => Promise<readonly PerfilDeCafe[]>;
  /** Lo que se recuerda del cliente entre conversaciones, y dónde anotar lo nuevo. */
  readonly memoria: {
    leer(clienteId: string): Promise<RecuerdoParaElTurno>;
    anotar(clienteId: string, notas: readonly string[]): Promise<void>;
  };
  readonly registrarPedido: (p: PedidoNuevo) => Promise<void>;
  /** El enlace de Khipu, o `undefined` si no hay cobro automático. */
  readonly cobrar: (pedidoId: string) => Promise<{ url: string } | undefined>;
  readonly reloj: Reloj;
  /** `CAFE_ROL_ENCARGADO`. */
  readonly rol: string;
}

/** Lo que el turno sabe del cliente de otras conversaciones: notas y pedidos, sin montos. */
export interface RecuerdoParaElTurno {
  readonly notas: readonly string[];
  readonly pedidosAnteriores: readonly {
    readonly fecha: string;
    readonly productos: readonly string[];
  }[];
}

export interface ClienteDelTurno {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly tramo: Tramo;
}

export interface EntradaDelTurno {
  /** El lote de la cola: un lote ya respondido no se vuelve a inferir. */
  readonly loteId: string;
  readonly conversacionId: string;
  readonly cliente: ClienteDelTurno;
  /** Los textos del lote, en orden. */
  readonly texto: string;
  /** El último mensaje del cliente (para reaccionarle). */
  readonly ultimoMensajeId?: string;
}

export interface ResultadoDelTurno {
  /** Vacío si hay traspaso: el texto lo elige quien avisa al equipo. */
  readonly texto: string;
  readonly contenido?: ContenidoInteractivo;
  readonly traspaso?: PedidoDeTraspaso;
  /** Un reclamo que el chatbot atiende: queda en la bandeja sin pausar. */
  readonly reclamo?: { readonly motivo: string; readonly resumen: string };
  readonly inferencias: number;
}

/** Lo que el turno en curso sabe y va cambiando. */
export interface TurnoEnCurso {
  readonly deps: DepsDelTurno;
  readonly entrada: EntradaDelTurno;
  readonly foto: FotoDelCatalogo;
  readonly tarifas: readonly TarifaDeDespacho[];
  readonly faq: readonly { pregunta: string; respuesta: string }[];
  readonly perfiles: readonly PerfilDeCafe[];
  readonly recuerdo: RecuerdoParaElTurno;
  readonly ahora: Date;
  estado: EstadoDelTurno;
  inferencias: number;
}

export const responder = (
  t: TurnoEnCurso,
  texto: string,
  extra: Partial<ResultadoDelTurno> = {},
): ResultadoDelTurno => ({ texto, inferencias: t.inferencias, ...extra });

export const traspasar = (
  t: TurnoEnCurso,
  traspaso: PedidoDeTraspaso,
): ResultadoDelTurno => ({
  texto: "",
  traspaso,
  inferencias: t.inferencias,
});
