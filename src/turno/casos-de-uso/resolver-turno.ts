import { LimiteDeGastoAlcanzado } from "../../modelo/puertos/modelo.js";
import { eleccionEnTexto } from "../../whatsapp/dominio/interactivos/eleccion.js";
import { senalesDeEnojo } from "../dominio/animo.js";
import { PrecioPendiente } from "../dominio/cotizar.js";
import { propuestaVigente, reclamoAbierto } from "../dominio/estado.js";
import { clasificarRespuestaBreve } from "../dominio/respuesta-breve.js";
import { TEXTOS } from "../dominio/textos.js";
import {
  porEnojo,
  porPrecioPendiente,
  porRevision,
} from "../dominio/traspasos.js";
import { inferir, TurnoSinDecision } from "./inferir.js";
import { aceptar, retirar } from "./pedido-del-turno.js";
import { ejecutarDecision } from "./responder-decision.js";
import {
  responder,
  traspasar,
  type ResultadoDelTurno,
  type TurnoEnCurso,
} from "./tipos.js";

/** «Confirmar» y «Cambiar algo» del resumen son un «sí» y un «no». */
function textoParaClasificar(texto: string) {
  const eleccion = eleccionEnTexto(texto);
  if (eleccion?.id === "confirmar") return "sí";
  if (eleccion?.id === "cambiar") return "no";
  return texto;
}

/** Lo que se contesta sin modelo: enojo, «sí», «no» y «gracias». */
async function sinModelo(
  t: TurnoEnCurso,
): Promise<ResultadoDelTurno | undefined> {
  const texto = t.entrada.texto;
  const senales = senalesDeEnojo({
    texto,
    enReclamo: reclamoAbierto(t.estado, t.ahora),
  });
  if (senales.length) return traspasar(t, porEnojo(texto, senales));
  const breve = clasificarRespuestaBreve(textoParaClasificar(texto));
  const vigente = propuestaVigente(t.estado, t.ahora);
  if (breve?.tipo === "afirmativo" && vigente) return aceptar(t);
  if (breve?.tipo === "negativo" && t.estado.propuesta) return retirar(t);
  const cierre =
    breve?.tipo === "cierre" || (breve?.tipo === "afirmativo" && breve.gracias);
  if (cierre && !vigente) {
    const mensajeId = t.entrada.ultimoMensajeId;
    return responder(
      t,
      TEXTOS.cierre,
      mensajeId
        ? { contenido: { tipo: "reaccion", mensajeId, emoji: "👍" } }
        : {},
    );
  }
  return undefined;
}

/**
 * Un turno completo: lo que no necesita modelo, una decisión (reparada una vez) y su ejecución.
 * Todo error termina en un traspaso: el cliente nunca lee un mensaje de sistema.
 */
export async function resolverTurno(
  t: TurnoEnCurso,
): Promise<ResultadoDelTurno> {
  const texto = t.entrada.texto;
  try {
    return (
      (await sinModelo(t)) ?? (await ejecutarDecision(t, await inferir(t)))
    );
  } catch (error) {
    if (error instanceof PrecioPendiente)
      return traspasar(t, porPrecioPendiente(texto, error.sku));
    if (error instanceof LimiteDeGastoAlcanzado)
      return traspasar(t, porRevision(texto, error.message));
    if (error instanceof TurnoSinDecision)
      return traspasar(t, porRevision(texto, error.causa));
    console.error("el turno falló", error);
    return traspasar(
      t,
      porRevision(texto, `El turno falló: ${(error as Error).message}`),
    );
  }
}
