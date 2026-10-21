import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { PerfilesDeCafe } from "../../catalogo/index.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarPerfiles } from "./cargar-perfiles.js";

const familias = new Set(["futaleufu", "cerro-alegre", "punta-de-lobos"]);

describe("cargar los perfiles de los cafés", () => {
  it("carga los que tienen notas, cuenta los pendientes; repetirla no cambia nada", async () => {
    const perfiles = new PerfilesDeCafe(new RegistrosEnMemoria());
    const definidos = [
      { familia: "futaleufu", notas: "Chocolate y nuez; cuerpo medio." },
      { familia: "cerro-alegre", notas: "" },
    ];
    const r = resumenVacio();
    await cargarPerfiles(perfiles, definidos, familias, r);
    expect(await perfiles.leer()).toEqual([definidos[0]]);
    expect(r.cambios).toEqual(["perfil de «futaleufu» cargado"]);
    expect(r.pendientes).toEqual([
      "2 cafés sin notas de cata: cerro-alegre, punta-de-lobos",
    ]);
    const otra = resumenVacio();
    await cargarPerfiles(perfiles, definidos, familias, otra);
    expect(otra.cambios).toEqual([]);
  });

  it("un perfil de un café que no está en el catálogo no se carga", async () => {
    const perfiles = new PerfilesDeCafe(new RegistrosEnMemoria());
    await expect(
      cargarPerfiles(
        perfiles,
        [{ familia: "inventado", notas: "Dulce" }],
        familias,
        resumenVacio(),
      ),
    ).rejects.toThrow(/inventado/);
  });
});
