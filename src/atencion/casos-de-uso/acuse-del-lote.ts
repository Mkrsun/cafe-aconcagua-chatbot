import { TEXTOS } from "../../turno/dominio/textos.js";
import type { LoteEnCola } from "../../whatsapp/puertos/cola.js";

/** Un lote sin texto legible recibe UN acuse, por prioridad: audio > imagen > lo demás. */
export function acuseDelLote(lote: LoteEnCola): string {
  const tipos = new Set(lote.mensajes.map((m) => m.tipo));
  if (tipos.has("audio")) return TEXTOS.acuseAudio;
  if (tipos.has("image")) return TEXTOS.acuseImagen;
  return TEXTOS.acuseOtro;
}
