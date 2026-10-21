import type { Configuracion } from "./tipos.js";
import { texto, type Entorno } from "./lectores.js";

/** Variables que solo existen para apuntar a dobles de prueba: nunca en un despliegue real. */
const SOLO_PRUEBAS = ["META_GRAPH_BASE_URL", "KHIPU_BASE_URL"];

/**
 * En producción no se arranca a medias: base de datos, tarifa del modelo (sin ella el límite
 * de gasto no corta) y firma de WhatsApp.
 */
export function exigirProduccion(c: Configuracion, env: Entorno): void {
  const faltas: string[] = [];
  if (!c.databaseUrl) faltas.push("DATABASE_URL es obligatoria en producción");
  if (!c.modelo.tarifa)
    faltas.push("CAFE_MODELO_TARIFA_USD_POR_MTOK es obligatoria en producción");
  if (texto(env, "WHATSAPP_VERIFY_TOKEN") && !texto(env, "WHATSAPP_APP_SECRET"))
    faltas.push(
      "WHATSAPP_APP_SECRET es obligatorio en producción para validar la firma de Meta",
    );
  for (const variable of SOLO_PRUEBAS)
    if (texto(env, variable))
      faltas.push(`${variable} es solo pruebas: no va en producción`);
  if (faltas.length) throw new Error(faltas.join("; "));
}
