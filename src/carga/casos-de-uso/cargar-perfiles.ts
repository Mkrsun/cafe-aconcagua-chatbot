import { huellaDe } from "../../plataforma/huella.js";
import type { PerfilesDeCafe } from "../../catalogo/index.js";
import { validarPerfil } from "../../catalogo/dominio/perfil.js";
import type { PerfilDefinido } from "../dominio/definiciones.js";
import type { ResumenDeCarga } from "../dominio/resumen.js";

/**
 * Deja los perfiles iguales a los definidos con notas; los vacíos son cafés pendientes de perfil.
 * Un perfil de un café que no está en el catálogo es un error de tipeo: no se carga nada.
 */
export async function cargarPerfiles(
  perfiles: PerfilesDeCafe,
  definidos: readonly PerfilDefinido[],
  familias: ReadonlySet<string>,
  r: ResumenDeCarga,
) {
  const validos = definidos.map(validarPerfil);
  const ajenos = validos.filter((p) => !familias.has(p.familia));
  if (ajenos.length)
    throw new Error(
      `Perfiles de cafés que no están en el catálogo: ${ajenos.map((p) => p.familia).join(", ")}`,
    );
  const conNotas = validos.filter((p) => p.notas);
  const actuales = new Map(
    (await perfiles.leer()).map((p) => [p.familia, p.notas]),
  );
  if (
    huellaDe([...actuales]) !==
    huellaDe(conNotas.map((p) => [p.familia, p.notas]))
  ) {
    await perfiles.reemplazar(conNotas);
    for (const p of conNotas)
      if (actuales.get(p.familia) !== p.notas)
        r.cambios.push(`perfil de «${p.familia}» cargado`);
  }
  const sinNotas = [...familias].filter(
    (f) => !conNotas.some((p) => p.familia === f),
  );
  if (sinNotas.length)
    r.pendientes.push(
      `${sinNotas.length} cafés sin notas de cata: ${sinNotas.join(", ")}`,
    );
}
