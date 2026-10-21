import { describe, expect, it } from "vitest";
import { claveDeRegistro, type IRegistros } from "./puerto.js";

/** El contrato de los registros duraderos: lo pasan la memoria y PostgreSQL. */
export function contratoDeRegistros(crear: () => Promise<IRegistros>) {
  describe("contrato de registros duraderos", () => {
    it("guarda y lee un documento JSON; lo que no existe es undefined", async () => {
      const registros = await crear();
      const clave = claveDeRegistro("doc", "1");
      expect(await registros.leer(clave)).toBeUndefined();
      await registros.guardar(clave, { a: 1, lista: ["x"] });
      expect(await registros.leer(clave)).toEqual({ a: 1, lista: ["x"] });
      await registros.guardar(clave, { a: 2 });
      expect(await registros.leer(clave)).toEqual({ a: 2 });
    });

    it("bajo la misma llave las escrituras no se pisan", async () => {
      const registros = await crear();
      const clave = claveDeRegistro("contador");
      const sumar = () =>
        registros.bajoLlave(clave, async () => {
          const actual = (await registros.leer<number>(clave)) ?? 0;
          await new Promise((r) => setTimeout(r, 5));
          await registros.guardar(clave, actual + 1);
        });
      await Promise.all([sumar(), sumar(), sumar(), sumar()]);
      expect(await registros.leer(clave)).toBe(4);
    });

    it("una llave anidada sobre la misma clave no se bloquea a sí misma", async () => {
      const registros = await crear();
      const clave = claveDeRegistro("anidada");
      const valor = await registros.bajoLlave(clave, () =>
        registros.bajoLlave(clave, async () => "dentro"),
      );
      expect(valor).toBe("dentro");
    });
  });
}
