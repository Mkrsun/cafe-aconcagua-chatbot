import { describe, expect, it } from "vitest";
import { decision, mundoDelTurno } from "../test-support/mundo-del-turno.js";

const proponer = (extra = {}) =>
  decision({
    action: "PROPONER",
    changes: [{ sku: "0028", cantidad: 2 }],
    response: "¡Buenísimo! Te dejo el resumen:",
    ...extra,
  });

describe("el turno: del resumen al pago", () => {
  it("PROPONER arma el resumen con el total del catálogo y botones Confirmar/Cambiar", async () => {
    const m = await mundoDelTurno([proponer()]);
    const r = await m.atender("quiero 2 futaleufú molido");
    expect(r.texto).toBe(
      "¡Buenísimo! Te dejo el resumen:\n\n2 × Futaleufú — 150 gramos / Molido: $19.980\n" +
        "Total: $19.980\n¿Lo dejamos así?",
    );
    expect(r.contenido).toMatchObject({
      tipo: "botones",
      opciones: [
        { id: "confirmar", titulo: "Confirmar" },
        { id: "cambiar", titulo: "Cambiar algo" },
      ],
    });
  });

  it("«sipo» confirma sin inferir: registra el pedido y responde con el botón Pagar", async () => {
    const m = await mundoDelTurno([proponer()]);
    await m.atender("quiero 2 futaleufú molido");
    const r = await m.atender("sipo");
    expect(r.inferencias).toBe(0);
    expect(r.texto).toBe(
      "¡Listo, quedó tu pedido! Aquí puedes pagarlo: https://khipu.com/payment/info/khipu_1",
    );
    expect(r.contenido).toEqual({
      tipo: "enlace",
      cuerpo: r.texto,
      boton: "Pagar",
      url: "https://khipu.com/payment/info/khipu_1",
    });
    const [pedido] = await m.pedidos.listar({});
    expect(pedido?.estado).toBe("pago_pendiente");
    expect((await m.pedidos.obtener(pedido!.id))?.version?.total).toBe(19980);
  });

  it("si el cobro venció, {{pago}} manda un enlace nuevo y no el muerto", async () => {
    const m = await mundoDelTurno([
      proponer(),
      decision({ response: "Claro, aquí tienes: {{pago}}" }),
    ]);
    await m.atender("quiero 2 futaleufú molido");
    await m.atender("sipo");
    const [pedido] = await m.pedidos.listar({});
    const [pago] = await m.pedidos.pagosDe(pedido!.id);
    await m.pedidos.guardarPago({ ...pago!, estado: "rechazado" });
    const r = await m.atender("¿me mandas de nuevo el link?");
    expect(r.texto).toContain("https://khipu.com/payment/info/khipu_2");
    expect(r.texto).not.toContain("khipu_1");
  });

  it("el botón «Cambiar algo» retira la propuesta y pregunta qué cambiar", async () => {
    const m = await mundoDelTurno([proponer()]);
    await m.atender("quiero 2");
    const r = await m.atender("Cambiar algo [opción: cambiar]");
    expect(r).toMatchObject({
      texto: "Sin problema. ¿Qué te gustaría cambiar?",
      inferencias: 0,
    });
  });

  it("con una comuna conocida suma el despacho; desde el umbral es gratis", async () => {
    const m = await mundoDelTurno([
      proponer({ despacho: "Ñuñoa" }),
      proponer({ changes: [{ sku: "0028", cantidad: 6 }] }),
    ]);
    expect((await m.atender("2 a Ñuñoa")).texto).toContain(
      "Despacho a Santiago oriente: $3.990 (llega de 1 a 2 días hábiles después de salir)\n" +
        "Total: $23.970",
    );
    expect((await m.atender("mejor 6")).texto).toContain(
      "Despacho a Santiago oriente: gratis por ser un pedido desde $50.000",
    );
  });

  it("{{despacho}} decide lo gratis por los productos, no por el total con despacho", async () => {
    const m = await mundoDelTurno([
      proponer({ changes: [{ sku: "0028", cantidad: 5 }], despacho: "Ñuñoa" }),
      decision({ response: "El despacho: {{despacho}}" }),
    ]);
    expect((await m.atender("5 a Ñuñoa")).texto).toContain("Total: $53.940");
    const r = await m.atender("¿y cuánto es el despacho?");
    expect(r.texto).toContain("cuesta $3.990");
    expect(r.texto).not.toContain("cuesta $0");
  });

  it("una zona sin tarifa o un precio pendiente pasan a la encargada como consulta", async () => {
    const zona = await mundoDelTurno([proponer({ despacho: "Arica" })]);
    expect((await zona.atender("2 a Arica")).traspaso).toMatchObject({
      tipo: "consulta",
      motivo: "Despacho a «Arica» sin tarifa definida",
    });
    const precio = await mundoDelTurno(
      [proponer({ changes: [{ sku: "0040", cantidad: 1 }] })],
      { tramo: "mayorista" },
    );
    expect((await precio.atender("1 cerro alegre")).traspaso).toMatchObject({
      tipo: "consulta",
      motivo: "Precio pendiente de 0040: el cliente quiere pedirlo",
    });
  });

  it("sin Khipu, el pedido confirmado lo deja listo la encargada", async () => {
    const m = await mundoDelTurno([proponer()], { conKhipu: false });
    await m.atender("quiero 2");
    const r = await m.atender("dale");
    expect(r.traspaso).toMatchObject({ tipo: "pedido" });
    expect((await m.pedidos.listar({}))[0]?.estado).toBe("confirmado");
  });

  it("si la propuesta venció, el «sí» no registra nada a ciegas", async () => {
    const m = await mundoDelTurno([
      proponer(),
      decision({ response: "¿Te armo el resumen de nuevo?" }),
    ]);
    await m.atender("quiero 2");
    m.reloj.avanzar(25 * 3_600_000);
    const r = await m.atender("sí");
    expect(r.inferencias).toBe(1);
    expect(await m.pedidos.listar({})).toEqual([]);
  });
});
