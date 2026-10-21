import { describe, expect, it } from "vitest";
import { momentoEnChile } from "./momento.js";

describe("el momento del turno, como lo dice alguien en Chile", () => {
  it("día de la semana, fecha y hora local (con horario de verano)", () => {
    expect(momentoEnChile(new Date("2026-10-20T15:00:00.000Z"))).toBe(
      "martes 20 de octubre, 12:00",
    );
    expect(momentoEnChile(new Date("2026-07-04T23:30:00.000Z"))).toBe(
      "sábado 4 de julio, 19:30",
    );
  });
});
