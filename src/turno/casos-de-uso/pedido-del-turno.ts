import { huellaDe } from "../../plataforma/huella.js";
import {
  cotizarDespacho,
  type DespachoCotizado,
} from "../../catalogo/dominio/despacho/cotizar.js";
import { tarifaPara } from "../../catalogo/dominio/despacho/zonas.js";
import {
  aplicarCambios,
  cotizarLineas,
  type LineaPedida,
} from "../dominio/cotizar.js";
import type { Propuesta } from "../dominio/estado.js";
import { botonesDelResumen, botonPagar } from "../dominio/forma.js";
import { textoDelResumen } from "../dominio/resumen.js";
import { pedidoRegistrado, TEXTOS } from "../dominio/textos.js";
import { porPedidoSinCobro, porZonaSinTarifa } from "../dominio/traspasos.js";
import {
  responder,
  traspasar,
  type ResultadoDelTurno,
  type TurnoEnCurso,
} from "./tipos.js";

const DIA_MS = 86_400_000;

/** La zona dicha ahora (o la recordada) con su tarifa; dicha y sin tarifa es `undefined`. */
export function despachoDe(t: TurnoEnCurso, dicha: string) {
  const lugar = dicha.trim() || t.estado.zona;
  if (!lugar) return { lugar: undefined, tarifa: undefined };
  return { lugar, tarifa: tarifaPara(t.tarifas, lugar) };
}

/** Cotiza las líneas y el despacho: la propuesta que el cliente confirma con un «sí». */
function propuestaDe(
  t: TurnoEnCurso,
  lineas: readonly LineaPedida[],
  lugar?: string,
): Propuesta {
  const { lineas: cotizadas, totalProductos } = cotizarLineas(
    lineas,
    t.foto,
    t.entrada.cliente.tramo,
  );
  const tarifa = lugar ? tarifaPara(t.tarifas, lugar) : undefined;
  const despacho: DespachoCotizado | undefined =
    tarifa && cotizarDespacho(tarifa, totalProductos);
  const total = totalProductos + (despacho?.montoClp ?? 0);
  const contenido = {
    lineas: cotizadas,
    ...(despacho ? { despacho } : {}),
    total,
  };
  const venceEn = new Date(t.ahora.getTime() + DIA_MS).toISOString();
  return { ...contenido, digest: huellaDe(contenido), venceEn };
}

/** PROPONER: aplica los cambios, cotiza y responde la entrada del modelo + el resumen + botones. */
export function proponer(
  t: TurnoEnCurso,
  entrada: string,
  cambios: readonly LineaPedida[],
  dicha: string,
): ResultadoDelTurno {
  const { lugar, tarifa } = despachoDe(t, dicha);
  if (lugar && !tarifa)
    return traspasar(t, porZonaSinTarifa(t.entrada.texto, lugar));
  const lineas = aplicarCambios(t.estado.lineas, cambios);
  const propuesta = propuestaDe(t, lineas, lugar);
  t.estado = {
    ...t.estado,
    lineas,
    propuesta,
    ...(lugar ? { zona: lugar } : {}),
  };
  const texto = [entrada.trim(), textoDelResumen(propuesta)]
    .filter(Boolean)
    .join("\n\n");
  return responder(t, texto, { contenido: botonesDelResumen(texto) });
}

/**
 * El cliente aceptó la propuesta vigente: se revalida (si el precio cambió, se muestra el resumen
 * nuevo y no se registra), se registra el pedido y se cobra; sin cobro, lo deja listo la encargada.
 */
export async function aceptar(t: TurnoEnCurso): Promise<ResultadoDelTurno> {
  const vigente = t.estado.propuesta!;
  const nueva = propuestaDe(t, t.estado.lineas, t.estado.zona);
  if (nueva.digest !== vigente.digest) {
    t.estado = { ...t.estado, propuesta: nueva };
    const texto = `${TEXTOS.precioCambio}\n${textoDelResumen(nueva)}`;
    return responder(t, texto, { contenido: botonesDelResumen(texto) });
  }
  const conversacion = t.entrada.conversacionId;
  const pedidoId = `ped_${huellaDe({ conversacion, digest: vigente.digest })}`;
  await t.deps.registrarPedido({
    id: pedidoId,
    clienteId: t.entrada.cliente.id,
    conversacionId: t.entrada.conversacionId,
    lineas: vigente.lineas,
    total: vigente.total,
    ...(vigente.despacho
      ? { notas: `Despacho a ${vigente.despacho.zona}` }
      : {}),
  });
  const { propuesta: _p, ...resto } = t.estado;
  const enlace = await t.deps.cobrar(pedidoId);
  t.estado = {
    ...resto,
    lineas: [],
    pedido: { id: pedidoId, ...(enlace ? { url: enlace.url } : {}) },
  };
  if (!enlace)
    return traspasar(t, porPedidoSinCobro(t.entrada.texto, pedidoId));
  const texto = pedidoRegistrado(enlace.url);
  return responder(t, texto, { contenido: botonPagar(texto, enlace.url) });
}

/** «No» o «Cambiar algo» al resumen: se retira la propuesta (las líneas quedan para corregir). */
export function retirar(t: TurnoEnCurso): ResultadoDelTurno {
  const { propuesta: _p, ...resto } = t.estado;
  t.estado = resto;
  return responder(t, TEXTOS.queCambiar);
}
