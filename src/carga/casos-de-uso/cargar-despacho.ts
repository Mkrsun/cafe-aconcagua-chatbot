import { huellaDe } from "../../plataforma/huella.js";
import {
  validarTarifa,
  type DatosDeTarifa,
} from "../../catalogo/dominio/despacho/tarifa.js";
import type { ITarifasDeDespacho } from "../../catalogo/puertos/tarifas.js";
import type { ZonaDefinida } from "../dominio/definiciones.js";
import type { ResumenDeCarga } from "../dominio/resumen.js";
import { ACTOR_DE_LA_CARGA } from "./cargar-catalogo.js";

const contenido = (t: DatosDeTarifa) =>
  huellaDe({
    zona: t.zona,
    comunas: t.comunas,
    montoClp: t.montoClp,
    gratisDesdeClp: t.gratisDesdeClp ?? null,
    plazo: t.plazo,
    activa: t.activa,
  });

/** Deja las zonas de despacho iguales a las definiciones (la zona se reconoce por su nombre). */
export async function cargarDespacho(
  tarifas: ITarifasDeDespacho,
  definidas: readonly ZonaDefinida[],
  r: ResumenDeCarga,
) {
  const validas = definidas.map((z) => validarTarifa({ ...z }));
  const actuales = await tarifas.listar();
  for (const sobrante of actuales.filter(
    (t) => !validas.some((v) => v.zona === t.zona),
  )) {
    await tarifas.eliminar(sobrante.id, sobrante.revision, ACTOR_DE_LA_CARGA);
    r.cambios.push(`zona ${sobrante.zona} eliminada`);
  }
  for (const zona of validas) {
    const actual = actuales.find((t) => t.zona === zona.zona);
    if (!actual) {
      await tarifas.crear(zona, ACTOR_DE_LA_CARGA);
      r.cambios.push(`zona ${zona.zona} creada`);
    } else if (contenido(actual) !== contenido(zona)) {
      await tarifas.actualizar(
        actual.id,
        zona,
        actual.revision,
        ACTOR_DE_LA_CARGA,
      );
      r.cambios.push(`zona ${zona.zona} actualizada`);
    } else r.sinCambios.push(`zona ${zona.zona}`);
  }
}
