import { describe, expect, it } from "vitest";
import { decision, mundoDelTurno } from "../test-support/mundo-del-turno.js";

describe("el turno: precios desde el catálogo, nunca del modelo", () => {
  it("responde el precio del tramo del cliente con una sola inferencia", async () => {
    const guion = [
      decision({
        intent: "informacion",
        response: "El Futaleufú está a {{precio:0025}}.",
      }),
    ];
    const minorista = await mundoDelTurno(guion);
    expect(
      await minorista.atender("¿cuánto cuesta el futaleufú?"),
    ).toMatchObject({
      texto: "El Futaleufú está a $9.990.",
      inferencias: 1,
    });
    const mayorista = await mundoDelTurno([...guion], { tramo: "mayorista" });
    expect((await mayorista.atender("¿cuánto cuesta?")).texto).toBe(
      "El Futaleufú está a $7.990.",
    );
  });

  it("el modelo ve el catálogo sin montos", async () => {
    const m = await mundoDelTurno([decision({ response: "Hola" })]);
    await m.atender("hola");
    const [solicitud] = m.falso.llamadas;
    expect(solicitud?.system).toContain("0025");
    expect(solicitud?.system).not.toMatch(/\$\s?\d/);
    expect(solicitud?.user).toContain("¿Hacen factura?");
  });

  it("un monto escrito se repara con una segunda inferencia", async () => {
    const m = await mundoDelTurno([
      decision({ response: "Está a $9.990" }),
      decision({ response: "Está a {{precio:0025}}" }),
    ]);
    const r = await m.atender("¿precio?");
    expect(r).toMatchObject({ texto: "Está a $9.990", inferencias: 2 });
    expect(m.falso.llamadas[1]?.user).toContain("monto_escrito");
  });

  it("si la reparación también falla, pasa a la encargada para revisarlo", async () => {
    const m = await mundoDelTurno([
      decision({ response: "Está a $9.990" }),
      decision({ response: "Son 9.990 pesos" }),
    ]);
    const r = await m.atender("¿precio?");
    expect(r.traspaso).toMatchObject({ tipo: "revision" });
    expect(r.texto).toBe("");
  });

  it("una lista lleva solo los cafés con precio del tramo; sin ninguno, va en texto", async () => {
    const m = await mundoDelTurno(
      [
        decision({
          response: "Estos son nuestros cafés:",
          forma: { tipo: "lista", opciones: [], skus: ["0025", "0028"] },
        }),
        decision({
          response: "Mira estos:",
          forma: { tipo: "lista", opciones: [], skus: ["0025", "0040"] },
        }),
        decision({
          response: "Y este:",
          forma: { tipo: "lista", opciones: [], skus: ["0040"] },
        }),
      ],
      { tramo: "mayorista" },
    );
    const conLista = await m.atender("¿qué cafés tienen?");
    expect(conLista.contenido).toMatchObject({
      tipo: "lista",
      secciones: [
        {
          filas: [
            { id: "sku:0025", descripcion: expect.stringContaining("$7.990") },
            { id: "sku:0028", descripcion: expect.stringContaining("$7.990") },
          ],
        },
      ],
    });
    // 0040 no tiene precio mayorista: queda fuera, sin perder la lista.
    expect((await m.atender("¿y otros?")).contenido).toMatchObject({
      tipo: "lista",
      secciones: [{ filas: [{ id: "sku:0025" }] }],
    });
    expect((await m.atender("¿y ese?")).contenido).toBeUndefined();
  });

  it("el mismo lote dos veces no vuelve a inferir", async () => {
    const m = await mundoDelTurno([decision({ response: "Hola" })]);
    const entrada = {
      loteId: "lote_x",
      conversacionId: "conv_1",
      cliente: {
        id: "cli_1",
        nombre: "Ana",
        tipo: "minorista",
        tramo: "minorista" as const,
      },
      texto: "hola",
    };
    const a = await m.turno.atender(entrada);
    const b = await m.turno.atender(entrada);
    expect(b).toEqual(a);
    expect(m.falso.llamadas).toHaveLength(1);
  });
});
