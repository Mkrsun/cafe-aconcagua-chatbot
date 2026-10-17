import { cotizarDespacho } from "../../catalogo/dominio/despacho/cotizar.js";
import { MOTIVO_RECLAMO } from "../../bandeja/dominio/conversacion.js";
import type { DecisionDelTurno } from "../dominio/decision.js";
import {
  conNotaDeReclamo,
  conRefs,
  propuestaVigente,
} from "../dominio/estado.js";
import { formaPropuesta } from "../dominio/forma.js";
import { renderizarPrecios } from "../dominio/marcadores.js";
import { fraseDeDespacho, textoDelResumen } from "../dominio/resumen.js";
import { enlaceDePago, TEXTOS } from "../dominio/textos.js";
import {
  porDerivacion,
  porFaltaDeDato,
  porZonaSinTarifa,
} from "../dominio/traspasos.js";
import { aceptar, despachoDe, proponer } from "./pedido-del-turno.js";
import {
  responder,
  traspasar,
  type ResultadoDelTurno,
  type TurnoEnCurso,
} from "./tipos.js";

/** Los hechos que pone el sistema: resumen, pago, despacho y los precios del tramo. */
function hechos(
  t: TurnoEnCurso,
  texto: string,
  tarifaDespacho?: Parameters<typeof cotizarDespacho>[0],
) {
  const { propuesta, pedido } = t.estado;
  // Lo gratis se decide por los productos: el total ya trae el despacho cobrado.
  const productos = (propuesta?.lineas ?? []).reduce(
    (s, l) => s + l.subtotal,
    0,
  );
  const despacho = tarifaDespacho && cotizarDespacho(tarifaDespacho, productos);
  const conHechos = texto
    .replaceAll("{{resumen}}", propuesta ? textoDelResumen(propuesta) : "")
    .replaceAll(
      "{{pago}}",
      pedido?.url ? enlaceDePago(pedido.url) : TEXTOS.sinEnlace,
    )
    .replaceAll("{{despacho}}", despacho ? fraseDeDespacho(despacho) : "");
  const precios = {
    foto: t.foto,
    tramo: t.entrada.cliente.tramo,
    rol: t.deps.rol,
  };
  return renderizarPrecios(conHechos, precios).texto.trim();
}

/** El enlace vigente del pedido: si el cobro venció o se rechazó, el cobro crea uno nuevo. */
async function refrescarEnlace(t: TurnoEnCurso, texto: string) {
  const pedido = t.estado.pedido;
  if (!pedido || !texto.includes("{{pago}}")) return;
  const enlace = await t.deps.cobrar(pedido.id);
  t.estado = {
    ...t.estado,
    pedido: { id: pedido.id, ...(enlace ? { url: enlace.url } : {}) },
  };
}

/** Ejecuta la decisión del modelo. */
export async function ejecutarDecision(
  t: TurnoEnCurso,
  d: DecisionDelTurno,
): Promise<ResultadoDelTurno> {
  await refrescarEnlace(t, d.response);
  t.estado = conRefs(
    t.estado,
    d.knownRefs,
    new Set(t.foto.visibles.map((f) => f.sku)),
  );
  const texto = t.entrada.texto;
  if (d.action === "DERIVAR")
    return traspasar(
      t,
      d.intent === "informacion"
        ? porFaltaDeDato(texto, d.faltantes)
        : porDerivacion(texto),
    );
  const confirmaSinCambios = d.action === "CONFIRMAR" && !d.changes.length;
  if (confirmaSinCambios && propuestaVigente(t.estado, t.ahora))
    return aceptar(t);
  if (d.action === "PROPONER" || d.action === "CONFIRMAR")
    return proponer(t, hechos(t, d.response), d.changes, d.despacho);
  const { lugar, tarifa } = despachoDe(t, d.despacho);
  if (lugar && !tarifa) return traspasar(t, porZonaSinTarifa(texto, lugar));
  if (lugar) t.estado = { ...t.estado, zona: lugar };
  const respuesta = hechos(t, d.response, tarifa);
  if (d.intent === "reclamo") return reclamo(t, respuesta);
  const contenido = formaPropuesta(d.forma, respuesta, {
    foto: t.foto,
    tramo: t.entrada.cliente.tramo,
    hayTarifas: t.tarifas.some((x) => x.activa),
  });
  return responder(t, respuesta, contenido ? { contenido } : {});
}

const SIGUE_ATENDIENDO = "El chatbot pidió lo que falta y sigue atendiendo.";

/** Un reclamo tranquilo: el chatbot responde y deja el registro para el equipo, sin pausar. */
function reclamo(t: TurnoEnCurso, respuesta: string): ResultadoDelTurno {
  t.estado = conNotaDeReclamo(t.estado, t.entrada.texto, t.ahora);
  const notas = t.estado.reclamo!.notas.join(" / ");
  const resumen = `Cliente: "${notas.slice(0, 400)}"\n${SIGUE_ATENDIENDO}`;
  return responder(t, respuesta, {
    reclamo: { motivo: MOTIVO_RECLAMO, resumen },
  });
}
