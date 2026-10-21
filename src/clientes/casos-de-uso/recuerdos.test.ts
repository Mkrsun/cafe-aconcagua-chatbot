import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { RecuerdosDeClientes } from "./recuerdos.js";

const ahora = new Date("2026-10-20T15:00:00.000Z");

describe("los recuerdos de los clientes, en los registros duraderos", () => {
  it("cada cliente tiene los suyos; se anotan y se olvidan", async () => {
    const recuerdos = new RecuerdosDeClientes(new RegistrosEnMemoria());
    expect((await recuerdos.leer("cli_1")).notas).toEqual([]);
    await recuerdos.anotar(
      "cli_1",
      ["Prepara en moka", "Prefiere molido"],
      ahora,
    );
    await recuerdos.anotar("cli_2", ["Cafetería en Ñuñoa"], ahora);
    expect((await recuerdos.leer("cli_1")).notas.map((n) => n.texto)).toEqual([
      "Prepara en moka",
      "Prefiere molido",
    ]);
    await recuerdos.olvidar("cli_1", 1);
    expect((await recuerdos.leer("cli_1")).notas.map((n) => n.texto)).toEqual([
      "Prefiere molido",
    ]);
    expect((await recuerdos.leer("cli_2")).notas).toHaveLength(1);
  });
});
