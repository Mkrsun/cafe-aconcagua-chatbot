import { describe, expect, it } from "vitest";
import { decidirEnvio } from "./decidir-envio.js";
import { POLITICA_POR_DEFECTO, type PoliticaDeContacto } from "./politica.js";

const conConsentimiento = (
  consentimiento: PoliticaDeContacto["consentimiento"],
  whatsapp?: PoliticaDeContacto["consentimiento"],
): PoliticaDeContacto => ({
  ...POLITICA_POR_DEFECTO,
  consentimiento,
  ...(whatsapp ? { whatsapp } : {}),
});
// Un martes a las 12:00 de Chile (UTC−3).
const mediodia = new Date("2026-10-13T15:00:00.000Z");
const noche = new Date("2026-10-13T23:30:00.000Z");

describe("decidir un envío según la política de contacto", () => {
  it("una respuesta sale solo con la ventana de 24 h abierta", () => {
    const politica = conConsentimiento("retirado");
    expect(
      decidirEnvio({
        politica,
        tipo: "respuesta",
        ahora: mediodia,
        ventanaAbierta: true,
      }),
    ).toMatchObject({ permitido: true });
    expect(
      decidirEnvio({
        politica,
        tipo: "respuesta",
        ahora: mediodia,
        ventanaAbierta: false,
      }),
    ).toMatchObject({ permitido: false });
  });

  it("un aviso transaccional no sale con el consentimiento de WhatsApp retirado", () => {
    const base = {
      tipo: "transaccional" as const,
      ahora: mediodia,
      ventanaAbierta: false,
    };
    expect(
      decidirEnvio({ ...base, politica: conConsentimiento("desconocido") })
        .permitido,
    ).toBe(true);
    expect(
      decidirEnvio({
        ...base,
        politica: conConsentimiento("otorgado", "retirado"),
      }).permitido,
    ).toBe(false);
    expect(
      decidirEnvio({ ...base, politica: conConsentimiento("retirado") })
        .permitido,
    ).toBe(false);
  });

  it("uno promocional exige consentimiento, horario y días desde el último contacto", () => {
    const otorgado = conConsentimiento("otorgado");
    const base = { tipo: "promocional" as const, ventanaAbierta: false };
    expect(
      decidirEnvio({ ...base, politica: otorgado, ahora: mediodia }).permitido,
    ).toBe(true);
    expect(
      decidirEnvio({
        ...base,
        politica: conConsentimiento("desconocido"),
        ahora: mediodia,
      }).permitido,
    ).toBe(false);
    expect(
      decidirEnvio({ ...base, politica: otorgado, ahora: noche }).permitido,
    ).toBe(false);
    const hace3Dias = new Date(mediodia.getTime() - 3 * 86_400_000);
    expect(
      decidirEnvio({
        ...base,
        politica: otorgado,
        ahora: mediodia,
        ultimoContacto: hace3Dias,
      }).permitido,
    ).toBe(false);
  });
});
