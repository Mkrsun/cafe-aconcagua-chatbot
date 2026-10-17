import { describe, expect, it } from "vitest";
import { leerConfiguracion } from "../../launcher/config/configuracion.js";
import {
  EQUIPO_DE_EJEMPLO,
  SECRETO_DE_DESARROLLO,
} from "../entorno-de-desarrollo.js";
import { entornoLocal } from "./entorno-local.js";

const DOBLES = "http://127.0.0.1:8093";
const ENV = {
  OPENAI_API_KEY: "sk-de-rodo",
  DATABASE_URL: "postgresql://cafe:cafe@127.0.0.1:5433/cafe_dev",
};

describe("el entorno del servidor en modo local", () => {
  it("sin OPENAI_API_KEY no arranca y dice dónde ponerla", () => {
    expect(() => entornoLocal({ ...ENV, OPENAI_API_KEY: " " }, DOBLES)).toThrow(
      /Falta OPENAI_API_KEY en \.env/,
    );
  });

  it("sin una base de desarrollo tampoco", () => {
    expect(() => entornoLocal({ OPENAI_API_KEY: "sk" }, DOBLES)).toThrow(
      /DATABASE_URL/,
    );
    expect(() =>
      entornoLocal(
        { ...ENV, DATABASE_URL: "postgresql://x@db.cafe.cl/cafe_dev" },
        DOBLES,
      ),
    ).toThrow(/no es local/);
  });

  it("WhatsApp y Khipu van siempre a los dobles, aunque .env traiga los reales", () => {
    const env = entornoLocal(
      {
        ...ENV,
        META_ACCESS_TOKEN: "token-real",
        WHATSAPP_APP_SECRET: "secreto-real",
        CAFE_EQUIPO_WHATSAPP: "56987654321",
        KHIPU_API_KEY: "khipu-real",
        KHIPU_NOTIFY_URL: "https://cafe.cl/payments/khipu/webhook",
        CAFE_ENV: "desarrollo",
      },
      DOBLES,
    );
    expect(env).toMatchObject({
      META_GRAPH_BASE_URL: `${DOBLES}/graph`,
      KHIPU_BASE_URL: `${DOBLES}/khipu/v3`,
      WHATSAPP_APP_SECRET: SECRETO_DE_DESARROLLO,
      CAFE_EQUIPO_WHATSAPP: EQUIPO_DE_EJEMPLO,
      OPENAI_API_KEY: "sk-de-rodo",
    });
    expect(env.META_ACCESS_TOKEN).not.toBe("token-real");
    expect(env.KHIPU_API_KEY).not.toBe("khipu-real");
    expect(env).not.toHaveProperty("KHIPU_NOTIFY_URL");
    const config = leerConfiguracion(env);
    expect(config.entorno).toBe("desarrollo");
    expect(config.whatsapp?.graphBase).toMatch(/^http:\/\/127\.0\.0\.1:8093\//);
    expect(config.plantillas.pagoRecibido?.nombre).toBeTruthy();
    expect(config.plantillas.avisoAlEquipo?.nombre).toBeTruthy();
  });
});
