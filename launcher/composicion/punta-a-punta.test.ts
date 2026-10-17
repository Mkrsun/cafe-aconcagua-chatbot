import { createHmac } from "node:crypto";
import type pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../src/plataforma/test-support/base-de-pruebas.js";
import { pedir } from "../../src/plataforma/test-support/http.js";
import { decision } from "../../src/turno/test-support/mundo-del-turno.js";
import {
  aplicacionDePrueba,
  EQUIPO,
  SECRETO_DE_META,
} from "./aplicacion-de-prueba.js";

const CLIENTA = "56911112222";
const OTRO = "56933334444";
let n = 0;

const texto = (from: string, body: string) => ({
  id: `wamid.in.${++n}`,
  from,
  type: "text",
  text: { body },
});
const boton = (from: string, id: string, title: string) => ({
  id: `wamid.in.${++n}`,
  from,
  type: "interactive",
  interactive: { type: "button_reply", button_reply: { id, title } },
});

/** Lo que manda Meta, firmado con el secreto de la app. */
async function webhook(
  app: Awaited<ReturnType<typeof aplicacionDePrueba>>["app"],
  ...mensajes: object[]
) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { messages: mensajes } }] }],
  });
  const firma = `sha256=${createHmac("sha256", SECRETO_DE_META).update(cuerpo).digest("hex")}`;
  const r = await app.request("/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": firma,
    },
    body: cuerpo,
  });
  expect(r.status).toBe(200);
}

function escenario(pool?: () => Promise<pg.Pool>) {
  it("ráfaga, resumen con botones, confirmar, Khipu y pago recibido", async () => {
    const m = await aplicacionDePrueba(
      () =>
        decision({
          action: "PROPONER",
          changes: [{ sku: "0028", cantidad: 2 }],
          despacho: "Ñuñoa",
          response: "¡Buenísimo, Ana! Te dejo el resumen:",
        }),
      pool && (await pool()),
    );
    await m.configurarElNegocio();

    await webhook(
      m.app,
      texto(CLIENTA, "hola buenas"),
      texto(CLIENTA, "Necesito 2 bolsas de futaleufú molido"),
    );
    m.reloj.avanzar(10_000);
    await webhook(m.app, texto(CLIENTA, "para Ñuñoa. ¿Cuánto sería?"));
    m.reloj.avanzar(5_000);
    expect(await m.trabajos.despachar()).toBe(0);
    m.reloj.avanzar(10_000);
    expect(await m.trabajos.despachar()).toBe(1);

    expect(m.modelo.llamadas).toHaveLength(1);
    expect(JSON.parse(m.modelo.llamadas[0]!.user).mensaje).toBe(
      "hola buenas\nNecesito 2 bolsas de futaleufú molido\npara Ñuñoa. ¿Cuánto sería?",
    );
    const [resumen, ...otros] = m.canal.a(CLIENTA);
    expect(otros).toEqual([]);
    expect(resumen?.texto).toContain(
      "2 × Futaleufú — 150 gramos / Molido: $19.980",
    );
    expect(resumen?.texto).toContain("Despacho a Santiago oriente: $3.990");
    expect(resumen?.texto).toContain("Total: $23.970");
    expect(resumen?.contenido).toMatchObject({
      tipo: "botones",
      opciones: [{ id: "confirmar" }, { id: "cambiar" }],
    });

    await webhook(m.app, boton(CLIENTA, "confirmar", "Confirmar"));
    m.reloj.avanzar(10_000);
    await m.trabajos.despachar();
    expect(m.modelo.llamadas).toHaveLength(1);
    const pago = m.canal.a(CLIENTA)[1];
    expect(pago?.contenido).toMatchObject({
      tipo: "enlace",
      boton: "Pagar",
      url: "https://khipu.com/payment/info/khipu_1",
    });

    m.khipu.pagar("khipu_1");
    const aviso = await pedir(m.app, "POST", "/payments/khipu/webhook", {
      payment_id: "khipu_1",
    });
    expect(aviso.cuerpo).toEqual({ confirmado: true });
    expect(m.canal.a(CLIENTA)[2]?.plantilla).toEqual({
      nombre: "payment_received",
      idioma: "es",
      parametros: ["Ana Pérez", "$23.970"],
    });

    const [pedido] = await m.almacenes.pedidos.listar({});
    expect(pedido).toMatchObject({ estado: "pagado" });
    const [conversacion] = await m.almacenes.bandeja.listar();
    expect(conversacion).toMatchObject({
      telefono: CLIENTA,
      estado: "abierta",
    });
  });

  it("pedir una persona: aviso al equipo, el cliente lo sabe y queda pausada", async () => {
    const m = await aplicacionDePrueba(
      () => decision({ response: "no debería" }),
      pool && (await pool()),
    );
    await m.configurarElNegocio();
    await webhook(
      m.app,
      texto(OTRO, "quiero hablar con una persona, por favor"),
    );
    m.reloj.avanzar(60_000);
    await m.trabajos.despachar();

    expect(m.modelo.llamadas).toHaveLength(0);
    const [alEquipo] = m.canal.a(EQUIPO);
    expect(alEquipo?.plantilla).toMatchObject({
      nombre: "handoff_alert",
      parametros: [
        "Emporio Dos (56933334444)",
        "El cliente pidió hablar con una persona",
        expect.any(String),
      ],
    });
    expect(m.canal.a(OTRO).map((x) => x.texto)).toEqual([
      "Te entiendo, y quiero que esto quede bien resuelto: le paso tu caso a la encargada, " +
        "que te escribe por aquí en un ratito.",
    ]);
    expect(await m.almacenes.bandeja.listar("pausada")).toEqual([
      expect.objectContaining({
        motivoHandoff: "El cliente pidió hablar con una persona",
      }),
    ]);
  });
}

describe("punta a punta del backend, en memoria", () => escenario());

describirConPostgres("punta a punta del backend, con PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);
  escenario(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, [
      "cafe.precios",
      "cafe.formatos",
      "cafe.familias",
      "cafe.auditoria",
      "cafe.zonas_de_despacho",
      "cafe.cambios_de_consentimiento",
      "cafe.politicas_de_contacto",
      "cafe.telefonos_de_clientes",
      "cafe.clientes",
      "cafe.conversaciones",
      "cafe.pedidos",
      "cafe.versiones_de_pedidos",
      "cafe.pagos",
      "cafe.registros",
      "cafe.mensajes_entrantes",
      "cafe.lotes_entrantes",
      "cafe.mensajes_recibidos",
      "cafe.cartas_muertas",
    ]);
    return pool;
  });
});
