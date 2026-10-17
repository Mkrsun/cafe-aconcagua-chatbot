import { describe, expect, it } from "vitest";
import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import type { ITarifasDeDespacho } from "../puertos/tarifas.js";

const datos = {
  zona: "Santiago oriente",
  comunas: ["Providencia", "Ñuñoa"],
  montoClp: 3990,
  gratisDesdeClp: 30000,
  plazo: { desdeDias: 1, hastaDias: 2 },
  activa: true,
};

/** El contrato de las tarifas de despacho: lo pasan la memoria y PostgreSQL. */
export function contratoDeTarifas(crear: () => Promise<ITarifasDeDespacho>) {
  describe("contrato de tarifas de despacho", () => {
    it("crea con revisión 1, lista y audita", async () => {
      const tarifas = await crear();
      const tarifa = await tarifas.crear(datos, "Rodo");
      expect(tarifa).toMatchObject({
        ...datos,
        revision: 1,
        actualizadaPor: "Rodo",
      });
      expect(tarifa.id).toMatch(/^DES-/);
      expect(await tarifas.listar()).toEqual([tarifa]);
      const [evento] = await tarifas.auditoria();
      expect(evento).toMatchObject({
        accion: "zona.creada",
        entidad: "zona",
        entidadId: tarifa.id,
        actor: "Rodo",
      });
    });

    it("una zona o comuna repetida es un conflicto", async () => {
      const tarifas = await crear();
      await tarifas.crear(datos, "Rodo");
      await expect(
        tarifas.crear({ ...datos, zona: "Otra", comunas: ["NUNOA"] }, "Rodo"),
      ).rejects.toThrow(Conflicto);
    });

    it("actualiza con la revisión vigente y elimina", async () => {
      const tarifas = await crear();
      const tarifa = await tarifas.crear(datos, "Rodo");
      const nueva = await tarifas.actualizar(
        tarifa.id,
        { ...datos, montoClp: 4990 },
        1,
        "Glei",
      );
      expect(nueva).toMatchObject({ montoClp: 4990, revision: 2 });
      await expect(
        tarifas.actualizar(tarifa.id, datos, 1, "Glei"),
      ).rejects.toThrow(Conflicto);
      await tarifas.eliminar(tarifa.id, 2, "Rodo");
      expect(await tarifas.listar()).toEqual([]);
      await expect(tarifas.eliminar(tarifa.id, 2, "Rodo")).rejects.toThrow(
        NoEncontrado,
      );
      const acciones = (await tarifas.auditoria()).map((e) => e.accion);
      expect(acciones).toEqual([
        "zona.eliminada",
        "zona.actualizada",
        "zona.creada",
      ]);
    });
  });
}
