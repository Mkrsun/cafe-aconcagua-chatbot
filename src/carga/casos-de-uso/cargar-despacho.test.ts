import { describe, expect, it } from "vitest";
import { TarifasEnMemoria } from "../../catalogo/adaptadores/tarifas-en-memoria.js";
import type { ZonaDefinida } from "../dominio/definiciones.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarDespacho } from "./cargar-despacho.js";

const oriente: ZonaDefinida = {
  zona: "Santiago oriente",
  comunas: ["Ñuñoa", "Providencia"],
  montoClp: 3990,
  gratisDesdeClp: 40000,
  plazo: { desdeDias: 1, hastaDias: 2 },
};
const centro: ZonaDefinida = {
  zona: "Santiago centro",
  comunas: ["Santiago"],
  montoClp: 2990,
  plazo: { desdeDias: 1, hastaDias: 2 },
};

describe("cargar el despacho", () => {
  it("crea las zonas que faltan y no repite una carga igual", async () => {
    const tarifas = new TarifasEnMemoria();
    const r = resumenVacio();
    await cargarDespacho(tarifas, [oriente, centro], r);
    expect(r.cambios).toEqual([
      "zona Santiago oriente creada",
      "zona Santiago centro creada",
    ]);
    const otra = resumenVacio();
    await cargarDespacho(tarifas, [oriente, centro], otra);
    expect(otra.cambios).toEqual([]);
    expect(await tarifas.listar()).toHaveLength(2);
  });

  it("borra primero la que ya no está (libera sus comunas) y actualiza la cambiada", async () => {
    const tarifas = new TarifasEnMemoria();
    await cargarDespacho(tarifas, [oriente, centro], resumenVacio());
    const r = resumenVacio();
    await cargarDespacho(tarifas, [{ ...oriente, montoClp: 4490 }], r);
    expect(r.cambios).toEqual([
      "zona Santiago centro eliminada",
      "zona Santiago oriente actualizada",
    ]);
    const [unica] = await tarifas.listar();
    expect(unica).toMatchObject({ zona: "Santiago oriente", montoClp: 4490 });
  });

  it("rechaza una zona inválida antes de escribir nada", async () => {
    const tarifas = new TarifasEnMemoria();
    await expect(
      cargarDespacho(
        tarifas,
        [centro, { ...oriente, montoClp: -1 }],
        resumenVacio(),
      ),
    ).rejects.toThrow(/montoClp/);
    expect(await tarifas.listar()).toEqual([]);
  });
});
