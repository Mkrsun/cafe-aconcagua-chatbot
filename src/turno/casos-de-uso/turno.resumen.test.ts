import { describe, expect, it } from "vitest";
import { decision, mundoDelTurno } from "../test-support/mundo-del-turno.js";

const proponer = (extra = {}) =>
  decision({
    action: "PROPONER",
    changes: [{ sku: "0028", cantidad: 2 }],
    response: "¡Buenísimo! Te dejo el resumen:",
    ...extra,
  });

describe("el turno: el resumen que lee el cliente", () => {
  it("la comuna dicha después del resumen lo actualiza, y el «sí» confirma", async () => {
    const m = await mundoDelTurno([
      proponer(),
      decision({ despacho: "Ñuñoa", response: "Perfecto, anoto Ñuñoa." }),
    ]);
    await m.atender("quiero 2 futaleufú molido");
    const r = await m.atender("es para Ñuñoa");
    expect(r.texto).toBe(
      "Perfecto, anoto Ñuñoa.\n\n2 × Futaleufú — 150 gramos / Molido: $19.980\n" +
        "Despacho a Santiago oriente: $3.990 (llega de 1 a 2 días hábiles después de salir)\n" +
        "Total: $23.970\n¿Lo dejamos así?",
    );
    expect(r.contenido).toMatchObject({ tipo: "botones" });
    const confirmado = await m.atender("sí, confirmo");
    expect(confirmado.texto).toContain("¡Listo, quedó tu pedido!");
    expect(confirmado.texto).not.toContain("el precio cambió");
  });

  it("si el resumen cambió solo por el despacho, no dice que cambió el precio", async () => {
    const m = await mundoDelTurno([proponer({ despacho: "Ñuñoa" })]);
    await m.atender("quiero 2 futaleufú molido para Ñuñoa");
    const [zona] = await m.tarifas.listar();
    const {
      id,
      revision,
      actualizadaPor: _p,
      actualizadaEn: _a,
      ...datos
    } = zona!;
    await m.tarifas.actualizar(
      id,
      { ...datos, montoClp: 2990 },
      revision,
      "Rodo",
    );
    const r = await m.atender("sí");
    expect(r.texto).not.toContain("el precio cambió");
    expect(r.texto).toContain("el despacho cambió");
    expect(r.texto).toContain("Despacho a Santiago oriente: $2.990");
  });

  it("en PROPONER el precio suelto no se repite: va en el resumen", async () => {
    const m = await mundoDelTurno([
      proponer({ response: "Te propongo 2 Futaleufú molido. {{precio:0028}}" }),
    ]);
    const r = await m.atender("quiero 2 futaleufú molido");
    expect(r.texto).toMatch(/^Te propongo 2 Futaleufú molido\.\n\n2 × /);
    expect(r.texto).not.toContain("$9.990");
  });

  it("PROPONER sin productos no muestra un resumen vacío ni botones", async () => {
    const m = await mundoDelTurno([
      decision({
        action: "PROPONER",
        response: "Volcán Osorno lo tenemos solo en grano. ¿Te sirve así?",
      }),
    ]);
    const r = await m.atender("tení volcán osorno molido?");
    expect(r.texto).toBe(
      "Volcán Osorno lo tenemos solo en grano. ¿Te sirve así?",
    );
    expect(r.contenido).toBeUndefined();
  });

  it("{{despacho}} dentro de una frase no deja el punto doble", async () => {
    const m = await mundoDelTurno([
      decision({ despacho: "Ñuñoa", response: "Para Ñuñoa: {{despacho}}." }),
    ]);
    const r = await m.atender("¿cuánto cuesta el despacho a Ñuñoa?");
    expect(r.texto).toContain("después de salir.");
    expect(r.texto).not.toMatch(/[^.]\.\.(?!\.)/);
  });
});
