import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { PerfilesDeCafe } from "./perfiles-de-cafe.js";

describe("los perfiles de los cafés, en los registros duraderos", () => {
  it("sin carga no hay perfiles; reemplazar deja exactamente los dados", async () => {
    const perfiles = new PerfilesDeCafe(new RegistrosEnMemoria());
    expect(await perfiles.leer()).toEqual([]);
    await perfiles.reemplazar([{ familia: "futaleufu", notas: "Chocolate" }]);
    await perfiles.reemplazar([{ familia: "cerro-alegre", notas: "Frutal" }]);
    expect(await perfiles.leer()).toEqual([
      { familia: "cerro-alegre", notas: "Frutal" },
    ]);
  });
});
