import type pg from "pg";
import { RelojFalso } from "../../src/plataforma/reloj-falso.js";
import { ModeloFalso } from "../../src/modelo/adaptadores/modelo-falso.js";
import type { SolicitudAlModelo } from "../../src/modelo/puertos/modelo.js";
import { cargarDefiniciones } from "../../src/carga/index.js";
import {
  ANA,
  EMPORIO,
  NEGOCIO_DE_PRUEBA,
} from "../../src/carga/test-support/negocio-de-prueba.js";
import { KhipuFalso } from "../../src/pedidos/adaptadores/khipu-falso.js";
import { CanalEnMemoria } from "../../src/whatsapp/adaptadores/canal-en-memoria.js";
import { leerConfiguracion } from "../config/configuracion.js";
import { crearAplicacion } from "./aplicacion.js";

export const SECRETO_DE_META = "secreto-de-la-app-de-meta";
export const EQUIPO = "56900000001";

/** La aplicación completa con dobles en los bordes (modelo, WhatsApp, Khipu y reloj). */
export async function aplicacionDePrueba(
  responder: (s: SolicitudAlModelo) => unknown,
  pool?: pg.Pool,
) {
  const config = leerConfiguracion({
    OPENAI_API_KEY: "sk-prueba",
    CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,0.1,4",
    META_ACCESS_TOKEN: "token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_VERIFY_TOKEN: "verificar",
    WHATSAPP_APP_SECRET: SECRETO_DE_META,
    WHATSAPP_PAYMENT_TEMPLATE: "payment_received",
    WHATSAPP_HANDOFF_TEMPLATE: "handoff_alert",
    CAFE_EQUIPO_WHATSAPP: EQUIPO,
    KHIPU_API_KEY: "khipu",
  });
  const reloj = new RelojFalso(new Date("2026-10-16T15:00:00.000Z"));
  const canal = new CanalEnMemoria();
  const khipu = new KhipuFalso();
  const modelo = new ModeloFalso(responder);
  const aplicacion = await crearAplicacion({
    config,
    ...(pool ? { pool } : {}),
    bordes: { modelo, canal, proveedorDePago: khipu },
    reloj: reloj.ahora,
    dormir: async () => {},
  });
  const configurarElNegocio = () =>
    cargarDefiniciones(
      {
        ...aplicacion.almacenes,
        faq: aplicacion.servicios.faq,
        ahora: reloj.ahora,
      },
      NEGOCIO_DE_PRUEBA,
      [ANA, EMPORIO],
    );
  return { ...aplicacion, reloj, canal, khipu, modelo, configurarElNegocio };
}
