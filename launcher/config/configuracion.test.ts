import { describe, expect, it } from "vitest";
import { leerConfiguracion } from "./configuracion.js";

const minima = { OPENAI_API_KEY: "sk-prueba" };
const produccion = {
  ...minima,
  CAFE_ENV: "produccion",
  DATABASE_URL: "postgresql://x@db/cafe",
  CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,0.1,4",
};

describe("configuración por entorno", () => {
  it("usa los valores por defecto documentados", () => {
    const c = leerConfiguracion(minima);
    expect(c).toMatchObject({
      entorno: "desarrollo",
      puerto: 8092,
      rol: "la encargada",
      equipo: [],
      despachoCadaMs: 1000,
      tiempos: {
        incompletoMs: 45_000,
        normalMs: 25_000,
        cierreMs: 8_000,
        techoMs: 180_000,
      },
      modelo: {
        baseUrl: "https://api.openai.com/v1",
        nombre: "gpt-6-luna",
        timeoutMs: 25_000,
        limiteUSD: 50,
      },
    });
    expect(c.whatsapp).toBeUndefined();
    expect(c.khipu).toBeUndefined();
  });

  it("lee WhatsApp, plantillas, equipo, esperas y Khipu desde el entorno", () => {
    const c = leerConfiguracion({
      ...minima,
      META_ACCESS_TOKEN: "token",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      WHATSAPP_VERIFY_TOKEN: "verificar",
      WHATSAPP_APP_SECRET: "secreto",
      WHATSAPP_PAYMENT_TEMPLATE: "payment_received",
      WHATSAPP_HANDOFF_TEMPLATE: "handoff_alert",
      WHATSAPP_TEMPLATE_LANGUAGE: "es_CL",
      CAFE_EQUIPO_WHATSAPP: "+56 9 1111 2222, 56933334444",
      CAFE_ROL_ENCARGADO: "Glei",
      CAFE_ESPERA_CIERRE_MS: "100",
      KHIPU_API_KEY: "khipu",
      KHIPU_NOTIFY_URL:
        "https://chatbot.cafeaconcagua.cl/payments/khipu/webhook",
    });
    expect(c.whatsapp).toEqual({
      token: "token",
      phoneNumberId: "123",
      verifyToken: "verificar",
      appSecret: "secreto",
      graphBase: "https://graph.facebook.com/v25.0",
    });
    expect(c.plantillas).toEqual({
      pagoRecibido: { nombre: "payment_received", idioma: "es_CL" },
      avisoAlEquipo: { nombre: "handoff_alert", idioma: "es_CL" },
    });
    expect(c.equipo).toEqual(["56911112222", "56933334444"]);
    expect(c.rol).toBe("Glei");
    expect(c.tiempos.cierreMs).toBe(100);
    expect(c.khipu).toMatchObject({
      apiKey: "khipu",
      base: "https://payment-api.khipu.com/v3",
    });
  });

  it("sin clave del modelo no arranca; una tarifa mal escrita tampoco", () => {
    expect(() => leerConfiguracion({})).toThrow(/OPENAI_API_KEY/);
    expect(() =>
      leerConfiguracion({
        ...minima,
        CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,2",
      }),
    ).toThrow(/entrada,cacheada,salida/);
    expect(() =>
      leerConfiguracion({ ...minima, CAFE_ESPERA_CIERRE_MS: "-1" }),
    ).toThrow(/CAFE_ESPERA_CIERRE_MS/);
  });

  it("en producción exige base, tarifa y firma de WhatsApp", () => {
    expect(leerConfiguracion(produccion).entorno).toBe("produccion");
    for (const falta of ["DATABASE_URL", "CAFE_MODELO_TARIFA_USD_POR_MTOK"]) {
      const env: Record<string, string> = { ...produccion };
      delete env[falta];
      expect(() => leerConfiguracion(env)).toThrow(new RegExp(falta));
    }
    expect(() =>
      leerConfiguracion({
        ...produccion,
        WHATSAPP_VERIFY_TOKEN: "v",
        META_ACCESS_TOKEN: "t",
      }),
    ).toThrow(/WHATSAPP_APP_SECRET/);
    expect(() =>
      leerConfiguracion({
        ...produccion,
        KHIPU_BASE_URL: "http://127.0.0.1:4600",
      }),
    ).toThrow(/solo pruebas/);
  });
});
