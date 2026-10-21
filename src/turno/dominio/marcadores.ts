import { pesos } from "../../plataforma/pesos.js";
import type { FormatoEditable } from "../../catalogo/dominio/formato.js";
import {
  resolverPrecio,
  type FotoDelCatalogo,
} from "../../catalogo/dominio/precio.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import { precioPorConfirmar, TEXTOS } from "./textos.js";

/** `{{precio:SKU}}` (un formato) y `{{precios:FAMILIA}}` (los formatos de un café). */
export const MARCADOR_DE_PRECIO = /\{\{(precios?):([^{}]*)\}\}/g;

/** El texto sin los marcadores de precio (el resumen ya trae cada monto). */
export const sinMarcadoresDePrecio = (texto: string) =>
  texto
    .replace(MARCADOR_DE_PRECIO, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/** Los marcadores cuyo SKU o familia no existe en el catálogo: se reparan. */
export function marcadoresInvalidos(
  texto: string,
  foto: FotoDelCatalogo,
): string[] {
  const skus = new Set(foto.formatos.map((f) => f.sku));
  const familias = new Set(foto.formatos.map((f) => f.familia));
  return [...texto.matchAll(MARCADOR_DE_PRECIO)]
    .filter(([, tipo, clave]) =>
      tipo === "precio"
        ? !skus.has(clave!.trim())
        : !familias.has(clave!.trim()),
    )
    .map(([crudo]) => crudo);
}

/** "Futaleufú — 150 gramos / Molido" ⇒ "150 gramos / Molido". */
const etiquetaDelFormato = (f: FormatoEditable) =>
  f.nombre
    .split(/\s+[—–-]\s+/)
    .slice(1)
    .join(" — ")
    .trim() ||
  f.gramaje ||
  f.nombre;

export interface Precios {
  readonly foto: FotoDelCatalogo;
  readonly tramo: Tramo;
  readonly rol: string;
}

/**
 * Escribe los montos de los marcadores con el precio del tramo del cliente. Un precio pendiente se
 * dice "precio por confirmar" y la respuesta cierra con quién lo confirma; nunca un monto
 * inventado.
 */
export function renderizarPrecios(texto: string, p: Precios) {
  const visibles = new Set(p.foto.visibles.map((f) => f.sku));
  const pendientes = new Set<string>();
  const precioDe = (f: FormatoEditable) => {
    if (!visibles.has(f.sku)) return TEXTOS.noDisponible;
    const precio = resolverPrecio(p.foto, f.sku, p.tramo);
    if (precio.estado === "configurado") return pesos(precio.montoClp);
    pendientes.add(f.sku);
    return TEXTOS.porConfirmar;
  };
  const familia = (id: string) => {
    const formatos = p.foto.visibles.filter((f) => f.familia === id);
    const nombre =
      p.foto.formatos.find((f) => f.familia === id)?.familiaNombre ?? id;
    if (!formatos.length) return `${nombre}: ${TEXTOS.noDisponible}`;
    const lineas = formatos.map((f) => [etiquetaDelFormato(f), precioDe(f)]);
    // Una lista entera de «por confirmar» no informa nada y alarga el mensaje.
    if (lineas.every(([, precio]) => precio === TEXTOS.porConfirmar))
      return `${nombre}: ${TEXTOS.porConfirmar}`;
    return [
      `${nombre}:`,
      ...lineas.map(([etiqueta, precio]) => `- ${etiqueta}: ${precio}`),
    ].join("\n");
  };
  const escrito = texto.replace(
    MARCADOR_DE_PRECIO,
    (crudo, tipo: string, clave: string) => {
      if (tipo === "precios") return familia(clave.trim());
      const formato = p.foto.formatos.find((f) => f.sku === clave.trim());
      return formato ? precioDe(formato) : crudo;
    },
  );
  const cierre = precioPorConfirmar(p.rol, pendientes.size);
  return {
    texto: pendientes.size ? `${escrito.trimEnd()}\n${cierre}` : escrito,
    pendientes: [...pendientes],
  };
}

/** Cómo ve el modelo los montos que el sistema escribió antes: ocultos, para que no los copie. */
export const ocultarMontos = (texto: string) =>
  texto.replace(/\$\s?\d+(?:\.\d{3})*/g, "(monto)");
