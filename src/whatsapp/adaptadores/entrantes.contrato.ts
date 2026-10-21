import { describe, expect, it } from "vitest";
import type { IEntrantes } from "../puertos/entrantes.js";

/** El contrato del registro de entrantes (reclamo idempotente y cartas muertas). */
export function contratoDeEntrantes(
  crear: (vencimientoMs: number) => Promise<IEntrantes>,
) {
  describe("contrato de entrantes", () => {
    it("un mensaje se reclama una vez; soltarlo permite reintentar", async () => {
      const entrantes = await crear(60_000);
      expect(await entrantes.reclamar("wamid.1")).toBe(true);
      expect(await entrantes.reclamar("wamid.1")).toBe(false);
      await entrantes.soltar("wamid.1");
      expect(await entrantes.reclamar("wamid.1")).toBe(true);
      await entrantes.marcarProcesado("wamid.1");
      expect(await entrantes.reclamar("wamid.1")).toBe(false);
    });

    it("un reclamo vencido (el proceso murió) se puede volver a tomar", async () => {
      const entrantes = await crear(0);
      expect(await entrantes.reclamar("wamid.2")).toBe(true);
      expect(await entrantes.reclamar("wamid.2")).toBe(true);
    });

    it("guarda las cartas muertas", async () => {
      const entrantes = await crear(60_000);
      await entrantes.cartaMuerta({
        mensajeId: "wamid.3",
        datos: { texto: "hola" },
        error: "x",
      });
      expect(await entrantes.cartasMuertas()).toEqual([
        expect.objectContaining({
          mensajeId: "wamid.3",
          error: "x",
          datos: { texto: "hola" },
        }),
      ]);
    });
  });
}
