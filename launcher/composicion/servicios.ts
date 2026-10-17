import { DespacharLotes } from "../../src/atencion/casos-de-uso/despachar-lotes.js";
import { RecibirMensajes } from "../../src/atencion/casos-de-uso/recibir-mensajes.js";
import { ResponderLote } from "../../src/atencion/casos-de-uso/responder-lote.js";
import { AvisoAlEquipo } from "../../src/bandeja/casos-de-uso/aviso-al-equipo.js";
import { ResponderDesdeBandeja } from "../../src/bandeja/casos-de-uso/responder-desde-bandeja.js";
import { SostenerLaPausa } from "../../src/bandeja/casos-de-uso/sostener-la-pausa.js";
import { Traspasar } from "../../src/bandeja/casos-de-uso/traspasar.js";
import { BaseDeFaq } from "../../src/faq/index.js";
import { AvisarPagoRecibido } from "../../src/pedidos/casos-de-uso/avisar-pago-recibido.js";
import { CobrarPedido } from "../../src/pedidos/casos-de-uso/cobrar-pedido.js";
import { ConciliarPago } from "../../src/pedidos/casos-de-uso/conciliar-pago.js";
import { KhipuSinConfigurar } from "../../src/pedidos/adaptadores/khipu-sin-configurar.js";
import type { Contexto } from "./contexto.js";
import { crearTurno } from "./turno.js";

/** Los casos de uso armados con sus almacenes y bordes (la raíz de composición). */
export function crearServicios(c: Contexto) {
  const { config, almacenes: a, bordes, reloj } = c;
  const aviso = new AvisoAlEquipo({
    canal: bordes.canal,
    registros: a.registros,
    numeros: config.equipo,
    ...(config.plantillas.avisoAlEquipo
      ? { plantilla: config.plantillas.avisoAlEquipo }
      : {}),
    reloj,
  });
  const faq = new BaseDeFaq(a.registros, reloj);
  const { turno, gasto } = crearTurno(c, aviso, faq);
  const traspasar = new Traspasar({
    bandeja: a.bandeja,
    aviso,
    rol: config.rol,
  });
  const sostener = new SostenerLaPausa({
    aviso,
    registros: a.registros,
    rol: config.rol,
    reloj,
  });
  const recibir = new RecibirMensajes({
    ...a,
    canal: bordes.canal,
    aviso,
    sostener,
    equipo: config.equipo,
    tiempos: config.tiempos,
    reloj,
  });
  const responderLote = new ResponderLote({
    ...a,
    canal: bordes.canal,
    turno,
    traspasar,
    aviso,
    reloj,
    reintentos: { intentos: 3, dormir: c.dormir },
  });
  const avisarPago = new AvisarPagoRecibido({
    ...a,
    canal: bordes.canal,
    reloj,
    ...(config.plantillas.pagoRecibido
      ? { plantilla: config.plantillas.pagoRecibido }
      : {}),
  });
  const conciliar = new ConciliarPago({
    pedidos: a.pedidos,
    proveedor: bordes.proveedorDePago ?? new KhipuSinConfigurar(),
    reloj,
    alPagar: (id) => avisarPago.ejecutar(id),
  });
  return {
    aviso,
    faq,
    gasto,
    recibir,
    despachar: new DespacharLotes({
      cola: a.cola,
      responder: responderLote,
      reloj,
    }),
    conciliar,
    responderDesdeBandeja: new ResponderDesdeBandeja({
      ...a,
      canal: bordes.canal,
      reloj,
    }),
    cobrar: new CobrarPedido({
      pedidos: a.pedidos,
      reloj,
      ...(bordes.proveedorDePago ? { proveedor: bordes.proveedorDePago } : {}),
    }),
  };
}

export type Servicios = ReturnType<typeof crearServicios>;
