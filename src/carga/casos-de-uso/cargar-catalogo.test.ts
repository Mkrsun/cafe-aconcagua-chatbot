import { describe, expect, it } from "vitest";
import { CatalogoEnMemoria } from "../../catalogo/adaptadores/catalogo-en-memoria.js";
import type { FormatoDefinido } from "../dominio/definiciones.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarCatalogo } from "./cargar-catalogo.js";

const molido: FormatoDefinido = {
  sku: "0028",
  nombre: "Futaleufú — 150 gramos / Molido",
  familia: "futaleufu",
  familiaNombre: "Futaleufú",
  gramaje: "150g",
  precios: { minorista: 9990, mayorista: null },
};
const grano: FormatoDefinido = {
  ...molido,
  sku: "0025",
  nombre: "Futaleufú — 150 gramos / Grano entero",
};

describe("cargar el catálogo", () => {
  it("crea los formatos que faltan con sus precios; lo pendiente queda pendiente", async () => {
    const catalogo = new CatalogoEnMemoria();
    const r = resumenVacio();
    await cargarCatalogo(catalogo, [molido], r);
    const [formato] = await catalogo.listar();
    expect(formato).toMatchObject({ sku: "0028", disponible: true });
    expect(formato?.precios.map((p) => [p.tramo, p.montoClp])).toEqual([
      ["minorista", 9990],
      ["mayorista", undefined],
    ]);
    expect(r.cambios).toEqual([
      "formato 0028 creado",
      "precio minorista de 0028: $9.990",
    ]);
    expect(r.pendientes).toEqual([
      "mayorista de Futaleufú — 150 gramos / Molido (0028)",
    ]);
  });

  it("una segunda carga igual no cambia nada", async () => {
    const catalogo = new CatalogoEnMemoria();
    await cargarCatalogo(catalogo, [molido], resumenVacio());
    const r = resumenVacio();
    await cargarCatalogo(catalogo, [molido], r);
    expect(r.cambios).toEqual([]);
    expect(r.sinCambios).toEqual(["formato 0028"]);
  });

  it("actualiza el formato y sus precios; un precio quitado vuelve a pendiente", async () => {
    const catalogo = new CatalogoEnMemoria();
    await cargarCatalogo(catalogo, [molido], resumenVacio());
    const r = resumenVacio();
    await cargarCatalogo(
      catalogo,
      [
        {
          ...molido,
          nombre: "Futaleufú molido 150 g",
          disponible: false,
          precios: { minorista: null, mayorista: 8490 },
        },
      ],
      r,
    );
    const [formato] = await catalogo.listar();
    expect(formato).toMatchObject({
      nombre: "Futaleufú molido 150 g",
      disponible: false,
    });
    expect(formato?.precios.map((p) => p.montoClp)).toEqual([undefined, 8490]);
    expect(r.cambios).toEqual([
      "formato 0028 actualizado",
      "precio minorista de 0028: pendiente",
      "precio mayorista de 0028: $8.490",
    ]);
  });

  it("archiva lo que ya no está en las definiciones", async () => {
    const catalogo = new CatalogoEnMemoria();
    await cargarCatalogo(catalogo, [molido, grano], resumenVacio());
    const r = resumenVacio();
    await cargarCatalogo(catalogo, [molido], r);
    expect((await catalogo.listar()).map((f) => f.sku)).toEqual(["0028"]);
    expect(r.cambios).toEqual(["formato 0025 archivado"]);
  });

  it("un formato archivado que vuelve a las definiciones se trae de vuelta", async () => {
    const catalogo = new CatalogoEnMemoria();
    await cargarCatalogo(catalogo, [molido, grano], resumenVacio());
    await cargarCatalogo(catalogo, [molido], resumenVacio());
    const r = resumenVacio();
    await cargarCatalogo(catalogo, [molido, grano], r);
    const vuelto = (await catalogo.listar()).find((f) => f.sku === "0025");
    expect(vuelto?.precios.map((p) => p.montoClp)).toEqual([9990, undefined]);
    expect(r.cambios).toEqual([
      "formato 0025 creado",
      "precio minorista de 0025: $9.990",
    ]);
  });

  it("rechaza un formato inválido antes de escribir nada", async () => {
    const catalogo = new CatalogoEnMemoria();
    await expect(
      cargarCatalogo(
        catalogo,
        [grano, { ...molido, precios: { minorista: -1, mayorista: null } }],
        resumenVacio(),
      ),
    ).rejects.toThrow(/montoClp/);
    expect(await catalogo.listar()).toEqual([]);
  });
});
