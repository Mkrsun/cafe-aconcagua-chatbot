import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { exigirBaseArriba } from "./base-de-desarrollo.js";
import { ejecutarSemilla } from "./semilla/ejecutar.js";

/** Un puerto donde no escucha nadie: como la base con Docker apagado. */
const puertoCerrado = () =>
  new Promise<number>((listo) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => listo(port));
    });
  });

describe("si la base no está arriba, se dice en simple qué hacer", () => {
  it("la revisión previa nombra el servidor y docker compose up -d", async () => {
    const puerto = await puertoCerrado();
    const url = `postgresql://cafe:cafe@127.0.0.1:${puerto}/cafe_dev`;
    await expect(exigirBaseArriba(url)).rejects.toThrow(
      new RegExp(`127\\.0\\.0\\.1:${puerto}.*docker compose up -d`, "s"),
    );
  });

  it("la semilla también lo explica", async () => {
    const puerto = await puertoCerrado();
    await expect(
      ejecutarSemilla({
        DATABASE_URL: `postgresql://cafe:cafe@127.0.0.1:${puerto}/cafe_dev`,
      }),
    ).rejects.toThrow(/docker compose up -d/);
  });
});
