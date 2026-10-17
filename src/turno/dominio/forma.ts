import { pesos } from "../../plataforma/pesos.js";
import {
  resolverPrecio,
  type FotoDelCatalogo,
} from "../../catalogo/dominio/precio.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import type { ContenidoInteractivo } from "../../whatsapp/dominio/interactivos/contenido.js";
import {
  largo,
  LIMITES,
  validarContenido,
} from "../../whatsapp/dominio/interactivos/validar.js";
import type { DecisionDelTurno } from "./decision.js";

const recortar = (t: string, max: number) =>
  largo(t) > max ? `${[...t].slice(0, max - 1).join("")}…` : t;

/** Solo si cumple los límites: una forma inválida cae a texto sin gastar otra inferencia. */
const siEsValido = (c: ContenidoInteractivo) =>
  validarContenido(c).valido ? c : undefined;

/** Botones del resumen: «Confirmar» y «Cambiar algo» (contractual, lo decide el sistema). */
export const botonesDelResumen = (cuerpo: string): ContenidoInteractivo => ({
  tipo: "botones",
  cuerpo,
  opciones: [
    { id: "confirmar", titulo: "Confirmar" },
    { id: "cambiar", titulo: "Cambiar algo" },
  ],
});

/** El botón «Pagar»: el cuerpo conserva la URL, así ningún cliente la pierde. */
export const botonPagar = (
  cuerpo: string,
  url: string,
): ContenidoInteractivo => ({
  tipo: "enlace",
  cuerpo,
  boton: "Pagar",
  url,
});

/** Las filas de una lista: el nombre y el precio del tramo; un SKU sin precio la descarta. */
function lista(
  cuerpo: string,
  skus: readonly string[],
  foto: FotoDelCatalogo,
  tramo: Tramo,
) {
  const filas = skus.slice(0, LIMITES.filas).map((sku) => {
    const f = foto.visibles.find((v) => v.sku === sku);
    const precio = resolverPrecio(foto, sku, tramo);
    if (!f || precio.estado !== "configurado") return undefined;
    const detalle = `${pesos(precio.montoClp)} · ${f.nombre}`;
    return {
      id: `sku:${sku}`,
      titulo: recortar(f.nombre, LIMITES.tituloDeFila),
      descripcion: recortar(detalle, LIMITES.descripcionDeFila),
    };
  });
  if (!filas.length || filas.some((f) => !f)) return undefined;
  return siEsValido({
    tipo: "lista",
    cuerpo,
    boton: "Ver cafés",
    secciones: [{ filas: filas.map((f) => f!) }],
  });
}

/** La forma que propuso el modelo, armada por el sistema; si no se puede, `undefined` (texto). */
export function formaPropuesta(
  forma: DecisionDelTurno["forma"],
  cuerpo: string,
  contexto: {
    readonly foto: FotoDelCatalogo;
    readonly tramo: Tramo;
    readonly hayTarifas: boolean;
  },
): ContenidoInteractivo | undefined {
  if (!cuerpo.trim()) return undefined;
  switch (forma.tipo) {
    case "lista":
      return lista(cuerpo, forma.skus, contexto.foto, contexto.tramo);
    case "botones":
      return siEsValido({
        tipo: "botones",
        cuerpo,
        opciones: forma.opciones
          .slice(0, 3)
          .map((titulo, i) => ({ id: `op:${i + 1}`, titulo })),
      });
    case "ubicacion":
      return contexto.hayTarifas
        ? siEsValido({ tipo: "pedir-ubicacion", cuerpo })
        : undefined;
    default:
      return undefined;
  }
}
