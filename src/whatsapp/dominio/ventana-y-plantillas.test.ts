import { describe, expect, it } from "vitest";
import {
  plantillaDeAvisoAlEquipo,
  plantillaDePagoRecibido,
} from "./plantillas.js";
import { dentroDeLaVentana } from "./ventana.js";

describe("ventana de 24 h", () => {
  const ahora = new Date("2026-10-16T12:00:00.000Z");
  it("abierta solo si el último entrante tiene menos de 24 h", () => {
    expect(dentroDeLaVentana({ at: "2026-10-15T12:00:01.000Z" }, ahora)).toBe(
      true,
    );
    expect(dentroDeLaVentana({ at: "2026-10-15T12:00:00.000Z" }, ahora)).toBe(
      false,
    );
    expect(dentroDeLaVentana(undefined, ahora)).toBe(false);
  });
});

describe("plantillas por nombre", () => {
  it("pago recibido lleva nombre y monto", () => {
    expect(
      plantillaDePagoRecibido(
        { nombre: "payment_received", idioma: "es" },
        "Ana",
        24990,
      ),
    ).toEqual({
      nombre: "payment_received",
      idioma: "es",
      parametros: ["Ana", "$24.990"],
    });
  });

  it("el aviso al equipo pone cada parámetro en una línea y acotado", () => {
    const p = plantillaDeAvisoAlEquipo(
      { nombre: "handoff_alert", idioma: "es" },
      {
        cliente: "Emporio Uno",
        motivo: "Pidió una persona",
        resumen: `línea 1\nlínea 2${"x".repeat(500)}`,
      },
    );
    expect(p.parametros[0]).toBe("Emporio Uno");
    expect(p.parametros[2]).not.toContain("\n");
    expect(p.parametros[2]!.length).toBeLessThanOrEqual(400);
  });
});
