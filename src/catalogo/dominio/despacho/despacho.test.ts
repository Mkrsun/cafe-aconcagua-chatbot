import { describe, expect, it } from "vitest";
import { DatosInvalidos } from "../../../plataforma/errores.js";
import { cotizarDespacho } from "./cotizar.js";
import { validarTarifa, type TarifaDeDespacho } from "./tarifa.js";
import { tarifaPara, zonaRepetida } from "./zonas.js";

const oriente: TarifaDeDespacho = {
  id: "DES-1",
  zona: "Santiago oriente",
  comunas: ["Providencia", "Ñuñoa", "Las Condes"],
  montoClp: 3990,
  gratisDesdeClp: 30000,
  plazo: { desdeDias: 1, hastaDias: 2 },
  activa: true,
  revision: 1,
  actualizadaPor: "dueño",
  actualizadaEn: "2026-10-16T12:00:00.000Z",
};

describe("despacho por zona", () => {
  it("reconoce la zona o una comuna exacta, sin tildes ni mayúsculas", () => {
    expect(tarifaPara([oriente], "nunoa")?.id).toBe("DES-1");
    expect(tarifaPara([oriente], "  SANTIAGO Oriente ")?.id).toBe("DES-1");
    expect(tarifaPara([oriente], "Ñuñoa alto")).toBeUndefined();
    expect(
      tarifaPara([{ ...oriente, activa: false }], "Ñuñoa"),
    ).toBeUndefined();
  });

  it("es gratis desde el umbral exacto o con monto 0", () => {
    expect(cotizarDespacho(oriente, 29999)).toMatchObject({
      montoClp: 3990,
      gratis: false,
    });
    expect(cotizarDespacho(oriente, 30000)).toMatchObject({
      montoClp: 0,
      gratis: true,
    });
    const sinCosto = { ...oriente, montoClp: 0, gratisDesdeClp: undefined };
    expect(cotizarDespacho(sinCosto, 1000)).toMatchObject({ gratis: true });
  });

  it("una zona o comuna pertenece a una sola tarifa", () => {
    const datos = { ...oriente, zona: "Otra", comunas: ["NUNOA"] };
    expect(zonaRepetida([oriente], datos)).toBe("NUNOA");
    expect(zonaRepetida([oriente], datos, "DES-1")).toBeUndefined();
  });

  it("valida montos, plazos y largos", () => {
    const base = {
      zona: "Regiones",
      comunas: [],
      montoClp: 6990,
      plazo: { desdeDias: 2, hastaDias: 5 },
    };
    expect(validarTarifa(base)).toEqual({ ...base, activa: true });
    expect(() => validarTarifa({ ...base, montoClp: -1 })).toThrow(
      DatosInvalidos,
    );
    expect(() =>
      validarTarifa({ ...base, plazo: { desdeDias: 5, hastaDias: 2 } }),
    ).toThrow(DatosInvalidos);
    expect(() => validarTarifa({ ...base, zona: "R" })).toThrow(DatosInvalidos);
    expect(() => validarTarifa({ ...base, gratisDesdeClp: 0 })).toThrow(
      DatosInvalidos,
    );
  });
});
