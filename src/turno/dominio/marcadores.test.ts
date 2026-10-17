import { describe, expect, it } from "vitest";
import { fotoDePrueba } from "../test-support/catalogo-de-prueba.js";
import { marcadoresInvalidos, renderizarPrecios } from "./marcadores.js";

const foto = fotoDePrueba();

describe("marcadores de precio: el sistema escribe los montos", () => {
  it("{{precio:SKU}} pone el precio del tramo del cliente", () => {
    const texto = "El Futaleufú en grano está a {{precio:0025}}.";
    expect(
      renderizarPrecios(texto, {
        foto,
        tramo: "minorista",
        rol: "la encargada",
      }).texto,
    ).toBe("El Futaleufú en grano está a $9.990.");
    expect(
      renderizarPrecios(texto, {
        foto,
        tramo: "mayorista",
        rol: "la encargada",
      }).texto,
    ).toBe("El Futaleufú en grano está a $7.990.");
  });

  it("{{precios:FAMILIA}} lista los formatos visibles de un café", () => {
    const r = renderizarPrecios("Te cuento:\n{{precios:futaleufu}}", {
      foto,
      tramo: "minorista",
      rol: "la encargada",
    });
    expect(r.texto).toBe(
      "Te cuento:\nFutaleufú:\n- 150 gramos / Grano entero: $9.990\n- 150 gramos / Molido: $9.990",
    );
  });

  it("un precio sin cargar se dice «por confirmar» y lo confirma la encargada", () => {
    const r = renderizarPrecios("El Cerro Alegre está a {{precio:0040}}.", {
      foto,
      tramo: "mayorista",
      rol: "Glei",
    });
    expect(r.texto).toBe(
      "El Cerro Alegre está a precio por confirmar.\n" +
        "Ese precio todavía no lo tengo confirmado; te lo confirma Glei.",
    );
    expect(r.pendientes).toEqual(["0040"]);
  });

  it("un producto pausado no se cotiza y un SKU o familia inexistente es inválido", () => {
    expect(
      renderizarPrecios("Siete Tazas: {{precio:0088}}", {
        foto,
        tramo: "minorista",
        rol: "x",
      }).texto,
    ).toBe("Siete Tazas: por ahora no lo tenemos disponible");
    expect(
      marcadoresInvalidos(
        "{{precio:9999}} y {{precios:nada}} y {{precio:0025}}",
        foto,
      ),
    ).toEqual(["{{precio:9999}}", "{{precios:nada}}"]);
  });
});
