import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RelojFalso } from "../../plataforma/reloj-falso.js";
import { TarifasEnMemoria } from "../../catalogo/adaptadores/tarifas-en-memoria.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import { ModeloFalso } from "../../modelo/adaptadores/modelo-falso.js";
import type {
  IModelo,
  SolicitudAlModelo,
} from "../../modelo/puertos/modelo.js";
import { KhipuFalso } from "../../pedidos/adaptadores/khipu-falso.js";
import { PedidosEnMemoria } from "../../pedidos/adaptadores/pedidos-en-memoria.js";
import { CobrarPedido } from "../../pedidos/casos-de-uso/cobrar-pedido.js";
import { RegistrarPedido } from "../../pedidos/casos-de-uso/registrar-pedido.js";
import { Turno } from "../casos-de-uso/turno.js";
import type { DecisionDelTurno } from "../dominio/decision.js";
import { fotoDePrueba } from "./catalogo-de-prueba.js";

/** Una decisión completa del modelo, con lo que el caso no especifica vacío. */
export const decision = (d: Partial<DecisionDelTurno>): DecisionDelTurno => ({
  intent: "pedido",
  action: "RESPONDER",
  changes: [],
  knownRefs: [],
  faltantes: [],
  despacho: "",
  forma: { tipo: "texto", opciones: [], skus: [] },
  response: "",
  ...d,
});

export interface OpcionesDelMundo {
  readonly tramo?: Tramo;
  readonly conKhipu?: boolean;
  readonly modelo?: (m: ModeloFalso) => IModelo;
}

/** Un turno con dobles de todo: el modelo responde lo que diga el guion, en orden. */
export async function mundoDelTurno(
  guion: DecisionDelTurno[],
  opciones: OpcionesDelMundo = {},
) {
  const reloj = new RelojFalso(new Date("2026-10-16T15:00:00.000Z"));
  const pendientes = [...guion];
  const falso = new ModeloFalso((_s: SolicitudAlModelo) => {
    const siguiente = pendientes.shift();
    if (!siguiente) throw new Error("el guion del modelo se acabó");
    return siguiente;
  });
  const tarifas = new TarifasEnMemoria();
  await tarifas.crear(
    {
      zona: "Santiago oriente",
      comunas: ["Ñuñoa", "Providencia"],
      montoClp: 3990,
      gratisDesdeClp: 50000,
      plazo: { desdeDias: 1, hastaDias: 2 },
      activa: true,
    },
    "Rodo",
  );
  const pedidos = new PedidosEnMemoria();
  const khipu = new KhipuFalso();
  const registros = new RegistrosEnMemoria();
  const turno = new Turno({
    modelo: opciones.modelo ? opciones.modelo(falso) : falso,
    registros,
    catalogo: async () => fotoDePrueba(),
    tarifas: () => tarifas.listar(),
    faq: async () => [
      { pregunta: "¿Hacen factura?", respuesta: "Sí, con RUT y giro." },
    ],
    registrarPedido: (p) =>
      new RegistrarPedido({ pedidos, reloj: reloj.ahora }).ejecutar(p),
    cobrar: (id) =>
      new CobrarPedido({
        pedidos,
        reloj: reloj.ahora,
        ...(opciones.conKhipu === false ? {} : { proveedor: khipu }),
      }).ejecutar(id),
    reloj: reloj.ahora,
    rol: "la encargada",
  });
  let lote = 0;
  /** Atiende y, como hace el canal cuando la respuesta sale, confirma el estado. */
  const atender = async (
    texto: string,
    ultimoMensajeId = `wamid.${lote + 1}`,
  ) => {
    const entrada = {
      loteId: `lote_${++lote}`,
      conversacionId: "conv_1",
      cliente: {
        id: "cli_1",
        nombre: "Ana",
        tipo: "minorista",
        tramo: opciones.tramo ?? "minorista",
      },
      texto,
      ultimoMensajeId,
    };
    const resultado = await turno.atender(entrada);
    await turno.confirmar(entrada);
    return resultado;
  };
  return {
    turno,
    atender,
    falso,
    pedidos,
    khipu,
    reloj,
    registros,
    pendientes,
    tarifas,
  };
}
