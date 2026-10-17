import { pesos } from "../../plataforma/pesos.js";
import type { FormatoEditable } from "../../catalogo/dominio/formato.js";
import { preciosPendientes } from "../../catalogo/dominio/precio.js";
import { TRAMOS } from "../../catalogo/dominio/tramos.js";
import {
  validarFormatoNuevo,
  validarMonto,
} from "../../catalogo/dominio/validar-formato.js";
import type { ICatalogoEditable } from "../../catalogo/puertos/catalogo.js";
import type { FormatoDefinido } from "../dominio/definiciones.js";
import type { ResumenDeCarga } from "../dominio/resumen.js";

export const ACTOR_DE_LA_CARGA = "carga-de-definiciones";

/** Valida todo antes de escribir: una definición con un error no deja la carga a medias. */
const validar = (definidos: readonly FormatoDefinido[]) =>
  definidos.map((d) => ({
    formato: validarFormatoNuevo({ ...d }),
    montos: TRAMOS.map((t) => [t, validarMonto(d.precios[t])] as const),
  }));

type Validado = ReturnType<typeof validar>[number];

const mismoFormato = (actual: FormatoEditable, d: Validado["formato"]) =>
  actual.nombre === d.nombre &&
  (actual.gramaje ?? "") === (d.gramaje ?? "") &&
  actual.disponible === d.disponible;

/** Deja el catálogo igual a las definiciones: crea, actualiza, fija precios y archiva lo demás. */
export async function cargarCatalogo(
  catalogo: ICatalogoEditable,
  definidos: readonly FormatoDefinido[],
  r: ResumenDeCarga,
) {
  const validados = validar(definidos);
  const vigentes = new Map((await catalogo.listar()).map((f) => [f.sku, f]));
  for (const v of validados) {
    await cargarFormato(catalogo, vigentes.get(v.formato.sku), v, r);
    vigentes.delete(v.formato.sku);
  }
  for (const sobrante of vigentes.values()) {
    await catalogo.archivar(sobrante.sku, sobrante.revision, ACTOR_DE_LA_CARGA);
    r.cambios.push(`formato ${sobrante.sku} archivado`);
  }
  for (const p of preciosPendientes(await catalogo.listar()))
    r.pendientes.push(`${p.tramo} de ${p.nombre} (${p.sku})`);
}

async function cargarFormato(
  catalogo: ICatalogoEditable,
  existente: FormatoEditable | undefined,
  { formato, montos }: Validado,
  r: ResumenDeCarga,
) {
  const cambios = r.cambios.length;
  let actual = existente;
  if (!actual) {
    actual = await catalogo.crear(formato, ACTOR_DE_LA_CARGA);
    r.cambios.push(`formato ${formato.sku} creado`);
  } else if (!mismoFormato(actual, formato)) {
    const { nombre, disponible } = formato;
    const cambio = { nombre, disponible, gramaje: formato.gramaje };
    actual = await catalogo.actualizar(
      formato.sku,
      cambio,
      actual.revision,
      ACTOR_DE_LA_CARGA,
    );
    r.cambios.push(`formato ${formato.sku} actualizado`);
  }
  for (const [tramo, monto] of montos) {
    const precio = actual.precios.find((p) => p.tramo === tramo)!;
    if ((precio.montoClp ?? null) === monto) continue;
    await catalogo.fijarPrecio(
      formato.sku,
      tramo,
      monto,
      precio.revision,
      ACTOR_DE_LA_CARGA,
    );
    const texto = monto === null ? "pendiente" : pesos(monto);
    r.cambios.push(`precio ${tramo} de ${formato.sku}: ${texto}`);
  }
  if (r.cambios.length === cambios) r.sinCambios.push(`formato ${formato.sku}`);
}
