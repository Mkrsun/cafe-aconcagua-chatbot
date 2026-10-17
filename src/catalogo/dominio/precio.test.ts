import { describe, expect, it } from "vitest";
import { fotoDe, preciosPendientes, resolverPrecio } from "./precio.js";
import { tramoDe } from "./tramos.js";
import { formatoEditable } from "./formato.js";

const futaleufu = formatoEditable(
  {
    sku: "0025",
    nombre: "Futaleufú — 150 gramos / Grano entero",
    familia: "futaleufu",
    familiaNombre: "Futaleufú",
    gramaje: "150g",
    disponible: true,
  },
  { minorista: 9990 },
);
const pausado = formatoEditable(
  { ...futaleufu, sku: "0028", disponible: false },
  { minorista: 9990, mayorista: 7990 },
);

describe("precio por tramo (un solo punto de precio)", () => {
  const foto = fotoDe([futaleufu, pausado]);

  it("el precio configurado del tramo del cliente", () => {
    expect(resolverPrecio(foto, "0025", "minorista")).toEqual({
      estado: "configurado",
      montoClp: 9990,
    });
  });

  it("un precio sin cargar es pendiente, nunca un monto inventado", () => {
    expect(resolverPrecio(foto, "0025", "mayorista")).toEqual({
      estado: "pendiente",
    });
    expect(resolverPrecio(foto, "no-existe", "minorista")).toEqual({
      estado: "pendiente",
    });
  });

  it("un formato no disponible no se cotiza", () => {
    expect(resolverPrecio(foto, "0028", "mayorista")).toEqual({
      estado: "pendiente",
    });
    expect(foto.visibles.map((f) => f.sku)).toEqual(["0025"]);
  });

  it("los pendientes listan sku, tramo y nombre", () => {
    expect(preciosPendientes([futaleufu])).toEqual([
      { sku: "0025", tramo: "mayorista", nombre: futaleufu.nombre },
    ]);
  });

  it("los tramos son minorista y mayorista; lo desconocido es minorista", () => {
    expect(tramoDe("mayorista")).toBe("mayorista");
    expect(tramoDe("vip")).toBe("minorista");
  });

  it("la revisión es estable para el mismo contenido y cambia con él", () => {
    const otra = formatoEditable({ ...futaleufu }, { minorista: 9990 });
    expect(otra.revision).toBe(futaleufu.revision);
    const cambiado = formatoEditable({ ...futaleufu, nombre: "Otro" }, {});
    expect(cambiado.revision).not.toBe(futaleufu.revision);
  });
});
