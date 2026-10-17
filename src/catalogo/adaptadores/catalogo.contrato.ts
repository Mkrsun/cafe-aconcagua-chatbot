import { describe, expect, it } from "vitest";
import { Conflicto, NoEncontrado } from "../../plataforma/errores.js";
import type { ICatalogoEditable } from "../puertos/catalogo.js";

const nuevo = {
  sku: "0025",
  nombre: "Futaleufú — 150 gramos / Grano entero",
  familia: "futaleufu",
  familiaNombre: "Futaleufú",
  gramaje: "150g",
  disponible: true,
};

/** El contrato del catálogo editable: lo pasan la memoria y PostgreSQL. */
export function contratoDelCatalogo(crear: () => Promise<ICatalogoEditable>) {
  describe("contrato del catálogo editable", () => {
    it("crea un formato con los dos tramos pendientes y lo audita", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      expect(formato).toMatchObject({ ...nuevo });
      expect(formato.precios.map((p) => [p.tramo, p.estado])).toEqual([
        ["minorista", "pendiente"],
        ["mayorista", "pendiente"],
      ]);
      expect((await catalogo.listar()).map((f) => f.sku)).toEqual(["0025"]);
      const [evento] = await catalogo.auditoria();
      expect(evento).toMatchObject({
        accion: "formato.creado",
        entidad: "formato",
        entidadId: "0025",
        actor: "Rodo",
      });
    });

    it("un SKU repetido es un conflicto", async () => {
      const catalogo = await crear();
      await catalogo.crear(nuevo, "Rodo");
      await expect(catalogo.crear(nuevo, "Rodo")).rejects.toThrow(Conflicto);
    });

    it("fija el precio de un tramo con su revisión y lo devuelve a pendiente", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      const pendiente = formato.precios[0]!;
      const fijado = await catalogo.fijarPrecio(
        "0025",
        "minorista",
        9990,
        pendiente.revision,
        "Rodo",
      );
      expect(fijado).toMatchObject({ estado: "configurado", montoClp: 9990 });
      await expect(
        catalogo.fijarPrecio(
          "0025",
          "minorista",
          8990,
          pendiente.revision,
          "Glei",
        ),
      ).rejects.toThrow(Conflicto);
      const vuelto = await catalogo.fijarPrecio(
        "0025",
        "minorista",
        null,
        fijado.revision,
        "Rodo",
      );
      expect(vuelto.estado).toBe("pendiente");
      const [ultimo] = await catalogo.auditoria();
      expect(ultimo).toMatchObject({
        accion: "precio.cambiado",
        entidad: "precio",
        entidadId: "0025:minorista",
        actor: "Rodo",
      });
      expect(ultimo?.antes).toMatchObject({ montoClp: 9990 });
    });

    it("edita con la revisión vigente; una vieja es un conflicto", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      const editado = await catalogo.actualizar(
        "0025",
        { nombre: "Futaleufú 150 g grano" },
        formato.revision,
        "Rodo",
      );
      expect(editado.nombre).toBe("Futaleufú 150 g grano");
      await expect(
        catalogo.actualizar(
          "0025",
          { disponible: false },
          formato.revision,
          "x",
        ),
      ).rejects.toThrow(Conflicto);
      await expect(
        catalogo.actualizar("nada", { disponible: false }, "r", "x"),
      ).rejects.toThrow(NoEncontrado);
    });

    it("archivar lo saca del catálogo vigente", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      await catalogo.archivar("0025", formato.revision, "Rodo");
      expect(await catalogo.listar()).toEqual([]);
    });

    it("crear un SKU archivado lo trae de vuelta con los datos nuevos", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      const fijado = await catalogo.fijarPrecio(
        "0025",
        "minorista",
        9990,
        formato.precios[0]!.revision,
        "Rodo",
      );
      expect(fijado.estado).toBe("configurado");
      await catalogo.archivar("0025", formato.revision, "Rodo");
      const otraFamilia = { familia: "ralun", familiaNombre: "Ralún" };
      const vuelto = await catalogo.crear(
        { ...nuevo, ...otraFamilia, nombre: "Ralún 150 g", disponible: false },
        "Glei",
      );
      expect(vuelto).toMatchObject({
        sku: "0025",
        nombre: "Ralún 150 g",
        ...otraFamilia,
        disponible: false,
      });
      expect(vuelto.precios.map((p) => p.estado)).toEqual([
        "pendiente",
        "pendiente",
      ]);
      expect(await catalogo.listar()).toEqual([vuelto]);
      const [evento] = await catalogo.auditoria();
      expect(evento).toMatchObject({
        accion: "formato.restaurado",
        entidad: "formato",
        entidadId: "0025",
        actor: "Glei",
        despues: vuelto,
      });
      await expect(catalogo.crear(nuevo, "Rodo")).rejects.toThrow(Conflicto);
    });

    it("crear con el nombre nuevo de una familia lo deja vigente para esa familia", async () => {
      const catalogo = await crear();
      const f = await catalogo.crear(nuevo, "Rodo");
      await catalogo.archivar(f.sku, f.revision, "Rodo");
      await catalogo.crear(
        { ...nuevo, familiaNombre: "Futaleufú Especial" },
        "Rodo",
      );
      const [vigente] = await catalogo.listar();
      expect(vigente?.familiaNombre).toBe("Futaleufú Especial");
    });

    it("archivar audita el formato como estaba", async () => {
      const catalogo = await crear();
      const formato = await catalogo.crear(nuevo, "Rodo");
      await catalogo.archivar("0025", formato.revision, "Rodo");
      const [evento] = await catalogo.auditoria();
      expect(evento).toMatchObject({
        accion: "formato.archivado",
        entidadId: "0025",
        antes: formato,
      });
    });
  });
}
