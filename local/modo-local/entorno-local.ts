import type { Entorno } from "../../launcher/config/lectores.js";
import { baseDeDesarrollo } from "../base-de-desarrollo.js";
import {
  EQUIPO_DE_EJEMPLO,
  SECRETO_DE_DESARROLLO,
} from "../entorno-de-desarrollo.js";

/** Lo de `.env` que apunta a WhatsApp o Khipu reales: en local no se usa nunca. */
const REALES = ["KHIPU_NOTIFY_URL"];

const sinDefinir = (env: Entorno) =>
  Object.fromEntries(
    Object.entries(env).filter(
      (e): e is [string, string] =>
        e[1] !== undefined && !REALES.includes(e[0]),
    ),
  );

function exigirClaveDelModelo(env: Entorno) {
  if (!env.OPENAI_API_KEY?.trim())
    throw new Error(
      "Falta OPENAI_API_KEY en .env: el modo local conversa con el modelo real de OpenAI. " +
        "Crea una clave en https://platform.openai.com/api-keys, agrégala a .env y vuelve a " +
        "correr pnpm local.",
    );
}

/**
 * El entorno del servidor en modo local: el de `.env` con el modelo real, una base
 * de desarrollo y WhatsApp y Khipu siempre en los dobles, aunque `.env` traiga los reales.
 */
export function entornoLocal(
  env: Entorno,
  dobles: string,
): Record<string, string> {
  exigirClaveDelModelo(env);
  return {
    ...sinDefinir(env),
    CAFE_ENV: "desarrollo",
    DATABASE_URL: baseDeDesarrollo(env),
    META_ACCESS_TOKEN: "token-local",
    WHATSAPP_PHONE_NUMBER_ID: "local",
    WHATSAPP_VERIFY_TOKEN: "verificar-local",
    WHATSAPP_APP_SECRET: SECRETO_DE_DESARROLLO,
    META_GRAPH_BASE_URL: `${dobles}/graph`,
    WHATSAPP_PAYMENT_TEMPLATE:
      env.WHATSAPP_PAYMENT_TEMPLATE?.trim() || "payment_received",
    WHATSAPP_HANDOFF_TEMPLATE:
      env.WHATSAPP_HANDOFF_TEMPLATE?.trim() || "handoff_alert",
    CAFE_EQUIPO_WHATSAPP: EQUIPO_DE_EJEMPLO,
    KHIPU_API_KEY: "khipu-local",
    KHIPU_BASE_URL: `${dobles}/khipu/v3`,
  };
}
