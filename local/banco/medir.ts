import {
  FalloDelModelo,
  type IModelo,
} from "../../src/modelo/puertos/modelo.js";
import type { MensajeSaliente } from "../../src/whatsapp/puertos/canal.js";
import type { Espera, LlamadaDelBanco } from "./escenario.js";

/** El modelo, contando cada llamada (tokens, latencia y fallo) para el informe. */
export function conContador(modelo: IModelo) {
  let llamadas: LlamadaDelBanco[] = [];
  const contado: IModelo = {
    async completar(s) {
      try {
        const r = await modelo.completar(s);
        llamadas.push({
          inputTokens: 0,
          outputTokens: 0,
          latenciaMs: 0,
          ...r.metricas,
        });
        return r;
      } catch (error) {
        const m = error instanceof FalloDelModelo ? error.metricas : undefined;
        llamadas.push({
          inputTokens: m?.inputTokens ?? 0,
          outputTokens: m?.outputTokens ?? 0,
          latenciaMs: m?.latenciaMs ?? 0,
          error: (error as Error).message,
        });
        throw error;
      }
    },
  };
  const tomar = () => [llamadas, (llamadas = [])][0]!;
  return { contado, tomar };
}

/** Cómo terminó el turno según lo que salió: aviso de traspaso, enlace, botones o reclamo. */
export function terminoDe(
  chatbot: readonly MensajeSaliente[],
  avisos: readonly string[],
): Espera {
  if (avisos.some((a) => a.startsWith("Te paso un cliente"))) return "traspaso";
  if (chatbot.some((m) => m.contenido?.tipo === "enlace")) return "pago";
  if (
    chatbot.some(
      (m) => m.contenido?.tipo === "botones" && m.texto.includes("Total:"),
    )
  )
    return "resumen";
  if (avisos.some((a) => a.startsWith("Registré un reclamo"))) return "reclamo";
  return "respuesta";
}
