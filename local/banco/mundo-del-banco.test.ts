import { describe, expect, it } from "vitest";
import { ModeloFalso } from "../../src/modelo/adaptadores/modelo-falso.js";
import { decision } from "../../src/turno/test-support/mundo-del-turno.js";
import type { Escenario } from "./escenario.js";
import { mundoDelBanco } from "./mundo-del-banco.js";

const caso = (id: string, pasos: Escenario["pasos"]): Escenario => ({
  id,
  descripcion: id,
  cliente: { nombre: `Cliente ${id}`, tipo: "minorista", tramo: "minorista" },
  pasos,
});

describe("el mundo del banco: la app completa en memoria con la semilla", () => {
  it("conversa con el modelo dado y deduce cómo terminó cada turno", async () => {
    const modelo = new ModeloFalso((s) =>
      s.user.includes("Puente Alto")
        ? decision({ despacho: "Puente Alto" })
        : decision({
            action: "PROPONER",
            changes: [{ sku: "0028", cantidad: 2 }],
            despacho: "Ñuñoa",
            response: "¡Buenísimo!",
          }),
    );
    const pedido = caso("pedido", [
      { cliente: ["hola", "2 futaleufú molido para Ñuñoa"] },
      { cliente: "sí" },
    ]);
    const sinZona = caso("sin-zona", [
      { cliente: "¿despachan a Puente Alto?" },
    ]);
    const banco = await mundoDelBanco(modelo, [pedido, sinZona]);

    const [propuesta, pago] = await banco.conversar(pedido);
    expect(propuesta).toMatchObject({ termino: "resumen" });
    expect(propuesta!.chatbot[0]).toContain("Total: $23.970");
    expect(propuesta!.llamadas).toHaveLength(1);
    expect(pago).toMatchObject({ termino: "pago" });

    const [traspaso] = await banco.conversar(sinZona);
    expect(traspaso).toMatchObject({ termino: "traspaso" });
    expect(traspaso!.chatbot[0]).toContain("A Puente Alto todavía no tengo");
    expect(traspaso!.avisosAlEquipo[0]).toContain("Te paso un cliente");
  });

  it("al volver tras una conversación resuelta, el cliente trae sus pedidos", async () => {
    const modelo = new ModeloFalso(() =>
      decision({ action: "PROPONER", changes: [{ sku: "0028", cantidad: 2 }] }),
    );
    const vuelve = caso("vuelve", [
      { cliente: "2 futaleufú molido" },
      { cliente: "sí" },
      { cliente: "hola! lo mismo de la otra vez", antes: "resolver" },
    ]);
    const banco = await mundoDelBanco(modelo, [vuelve]);
    await banco.conversar(vuelve);
    const ultimo = JSON.parse(modelo.llamadas.at(-1)!.user);
    // Conversación nueva: nada de la anterior en el estado, solo en el recuerdo.
    expect(ultimo.intercambios).toEqual([]);
    expect(ultimo.recuerdo.pedidosAnteriores[0].productos).toEqual([
      "2 × Futaleufú — 150 gramos / Molido",
    ]);
  });
});
