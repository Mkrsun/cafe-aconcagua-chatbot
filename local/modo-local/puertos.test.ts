import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { exigirPuertoLibre } from "./puertos.js";

let ocupante: Server | undefined;
afterEach(
  () => new Promise<void>((r) => (ocupante ? ocupante.close(() => r()) : r())),
);

const ocupar = () =>
  new Promise<number>((listo) => {
    ocupante = createServer().listen(0, () => {
      listo((ocupante!.address() as { port: number }).port);
    });
  });

describe("antes de arrancar, el modo local revisa sus puertos", () => {
  it("un puerto ocupado (otro pnpm local) se informa con la variable que lo cambia", async () => {
    const puerto = await ocupar();
    await expect(exigirPuertoLibre(puerto, "CAFE_PUERTO")).rejects.toThrow(
      new RegExp(`puerto ${puerto} .*ocupado.*CAFE_PUERTO`),
    );
  });

  it("un puerto libre deja seguir", async () => {
    const puerto = await ocupar();
    await new Promise<void>((r) => ocupante!.close(() => r()));
    ocupante = undefined;
    await expect(
      exigirPuertoLibre(puerto, "CAFE_PUERTO"),
    ).resolves.toBeUndefined();
  });
});
