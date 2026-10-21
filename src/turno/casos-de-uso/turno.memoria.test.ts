import { describe, expect, it } from "vitest";
import { decision, mundoDelTurno } from "../test-support/mundo-del-turno.js";

const userDe = (m: Awaited<ReturnType<typeof mundoDelTurno>>, i = 0) =>
  JSON.parse(m.falso.llamadas[i]!.user) as Record<string, unknown>;

describe("el turno: la memoria del cliente entre conversaciones", () => {
  it("lo que el modelo pide recordar queda anotado para ese cliente", async () => {
    const m = await mundoDelTurno([
      decision({ response: "¡Buena elección!", recordar: ["Prepara en moka"] }),
    ]);
    await m.atender("lo preparo en moka");
    expect(m.anotadas).toEqual([
      { clienteId: "cli_1", notas: ["Prepara en moka"] },
    ]);
  });

  it("sin nada que recordar no anota", async () => {
    const m = await mundoDelTurno([decision({ response: "Hola" })]);
    await m.atender("hola");
    expect(m.anotadas).toEqual([]);
  });

  it("las notas y los pedidos anteriores del cliente llegan al modelo; sin ellos, no", async () => {
    const recuerdo = {
      notas: ["Prefiere molido"],
      pedidosAnteriores: [
        {
          fecha: "2026-10-10",
          productos: ["2 × Futaleufú — 150 gramos / Molido"],
        },
      ],
    };
    const con = await mundoDelTurno([decision({ response: "Hola" })], {
      recuerdo,
    });
    await con.atender("hola, lo mismo de siempre");
    expect(userDe(con).recuerdo).toEqual(recuerdo);
    const sin = await mundoDelTurno([decision({ response: "Hola" })]);
    await sin.atender("hola");
    expect(userDe(sin).recuerdo).toBeUndefined();
  });
});
