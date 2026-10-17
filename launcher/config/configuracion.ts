import { normalizarTelefono } from "../../src/plataforma/telefono.js";
import {
  tarifaDesdeTexto,
  type TarifaDelModelo,
} from "../../src/modelo/dominio/costo.js";
import type { TiemposDeEspera } from "../../src/whatsapp/dominio/espera/tiempos.js";
import { entero, lista, numero, texto, type Entorno } from "./lectores.js";
import { exigirProduccion } from "./produccion.js";
import type { Configuracion } from "./tipos.js";

export type { Configuracion };

const TARIFA = "CAFE_MODELO_TARIFA_USD_POR_MTOK";

function modelo(env: Entorno): Configuracion["modelo"] {
  const apiKey = texto(env, "OPENAI_API_KEY");
  if (!apiKey)
    throw new Error(
      "OPENAI_API_KEY es obligatoria: es la clave del proveedor del modelo",
    );
  const tarifa = texto(env, TARIFA);
  const esfuerzo = texto(env, "CAFE_MODELO_ESFUERZO");
  return {
    baseUrl: texto(env, "CAFE_MODELO_BASE_URL") ?? "https://api.openai.com/v1",
    apiKey,
    nombre: texto(env, "CAFE_MODELO") ?? "gpt-6-luna",
    timeoutMs: entero(env, "CAFE_MODELO_TIMEOUT_MS", 25_000),
    ...(esfuerzo ? { reasoningEffort: esfuerzo } : {}),
    ...(tarifa ? { tarifa: tarifaDesdeTexto(tarifa, TARIFA) } : {}),
    limiteUSD: numero(env, "CAFE_LIMITE_GASTO_USD_MES", 50),
  };
}

function whatsapp(env: Entorno): Configuracion["whatsapp"] {
  const token = texto(env, "META_ACCESS_TOKEN");
  const phoneNumberId = texto(env, "WHATSAPP_PHONE_NUMBER_ID");
  const verifyToken = texto(env, "WHATSAPP_VERIFY_TOKEN");
  if (!token || !phoneNumberId || !verifyToken) return undefined;
  const appSecret = texto(env, "WHATSAPP_APP_SECRET");
  const base =
    texto(env, "META_GRAPH_BASE_URL") ?? "https://graph.facebook.com";
  const version = texto(env, "META_GRAPH_API_VERSION") ?? "v25.0";
  return {
    token,
    phoneNumberId,
    verifyToken,
    ...(appSecret ? { appSecret } : {}),
    graphBase: `${base}/${version}`,
  };
}

function plantillas(env: Entorno): Configuracion["plantillas"] {
  const idioma = texto(env, "WHATSAPP_TEMPLATE_LANGUAGE") ?? "es";
  const de = (variable: string) => {
    const nombre = texto(env, variable);
    return nombre ? { nombre, idioma } : undefined;
  };
  const pagoRecibido = de("WHATSAPP_PAYMENT_TEMPLATE");
  const avisoAlEquipo = de("WHATSAPP_HANDOFF_TEMPLATE");
  return {
    ...(pagoRecibido ? { pagoRecibido } : {}),
    ...(avisoAlEquipo ? { avisoAlEquipo } : {}),
  };
}

const tiempos = (env: Entorno): TiemposDeEspera => ({
  incompletoMs: entero(env, "CAFE_ESPERA_INCOMPLETA_MS", 45_000),
  normalMs: entero(env, "CAFE_VENTANA_AGRUPACION_MS", 25_000),
  cierreMs: entero(env, "CAFE_ESPERA_CIERRE_MS", 8_000),
  techoMs: entero(env, "CAFE_TECHO_AGRUPACION_MS", 180_000),
});

function khipu(env: Entorno): Configuracion["khipu"] {
  const apiKey = texto(env, "KHIPU_API_KEY");
  if (!apiKey) return undefined;
  const notifyUrl = texto(env, "KHIPU_NOTIFY_URL");
  const base =
    texto(env, "KHIPU_BASE_URL") ?? "https://payment-api.khipu.com/v3";
  return { apiKey, base, ...(notifyUrl ? { notifyUrl } : {}) };
}

/** La configuración del producto desde el entorno (README: variables de entorno). */
export function leerConfiguracion(env: Entorno): Configuracion {
  const databaseUrl = texto(env, "DATABASE_URL");
  const wa = whatsapp(env);
  const pago = khipu(env);
  const config: Configuracion = {
    entorno:
      texto(env, "CAFE_ENV") === "produccion" ? "produccion" : "desarrollo",
    puerto: entero(env, "CAFE_PUERTO", 8092),
    ...(databaseUrl ? { databaseUrl } : {}),
    modelo: modelo(env),
    ...(wa ? { whatsapp: wa } : {}),
    plantillas: plantillas(env),
    equipo: lista(env, "CAFE_EQUIPO_WHATSAPP").map(normalizarTelefono),
    rol: texto(env, "CAFE_ROL_ENCARGADO") ?? "la encargada",
    tiempos: tiempos(env),
    despachoCadaMs: entero(env, "CAFE_DESPACHO_CADA_MS", 1000),
    ...(pago ? { khipu: pago } : {}),
  };
  if (config.entorno === "produccion") exigirProduccion(config, env);
  return config;
}
