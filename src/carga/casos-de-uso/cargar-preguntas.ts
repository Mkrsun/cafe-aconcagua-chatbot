import {
  clavePregunta,
  validarDatos,
  type EntradaDeFaq,
} from "../../faq/dominio/entrada.js";
import type { BaseDeFaq } from "../../faq/index.js";
import type { PreguntaDefinida } from "../dominio/definiciones.js";
import type { ResumenDeCarga } from "../dominio/resumen.js";
import { ACTOR_DE_LA_CARGA } from "./cargar-catalogo.js";

const version = (e: EntradaDeFaq) => e.version ?? 1;

/** Deja publicadas exactamente las preguntas definidas (se reconocen por su texto). */
export async function cargarPreguntas(
  faq: BaseDeFaq,
  definidas: readonly PreguntaDefinida[],
  r: ResumenDeCarga,
) {
  const validas = definidas.map((p) => validarDatos({ ...p }));
  const claves = new Set(validas.map((v) => clavePregunta(v.pregunta)));
  for (const sobrante of (await faq.listar()).filter(
    (e) => !claves.has(clavePregunta(e.pregunta)),
  )) {
    await faq.eliminar(sobrante.id, version(sobrante), ACTOR_DE_LA_CARGA);
    r.cambios.push(`pregunta «${sobrante.pregunta}» eliminada`);
  }
  for (const datos of validas) {
    const actuales = await faq.listar();
    let actual = actuales.find(
      (e) => clavePregunta(e.pregunta) === clavePregunta(datos.pregunta),
    );
    const etiqueta = `pregunta «${datos.pregunta}»`;
    if (!actual) {
      actual = await faq.crear({ ...datos }, ACTOR_DE_LA_CARGA);
      r.cambios.push(`${etiqueta} creada`);
    } else if (
      actual.pregunta !== datos.pregunta ||
      actual.respuesta !== datos.respuesta ||
      actual.tema !== datos.tema
    ) {
      actual = await faq.editar(
        actual.id,
        { ...datos },
        version(actual),
        ACTOR_DE_LA_CARGA,
      );
      r.cambios.push(`${etiqueta} actualizada`);
    } else if (actual.estado === "publicada") {
      r.sinCambios.push(etiqueta);
      continue;
    }
    if (actual.estado !== "publicada")
      await faq.publicar(actual.id, version(actual), ACTOR_DE_LA_CARGA);
  }
}
