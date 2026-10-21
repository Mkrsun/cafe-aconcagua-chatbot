import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { MensajeEnviado } from "../../e2e/dobles/graph.js";
import { aplicacionDePrueba } from "../../launcher/composicion/aplicacion-de-prueba.js";
import { RecuerdosDeClientes } from "../../src/clientes/index.js";
import { pedir } from "../../src/plataforma/test-support/http.js";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import type { MensajeDeMeta } from "../conversar/webhook.js";
import { crearSimulador } from "./api.js";

const ANA = CLIENTES_DE_EJEMPLO.minorista;
const EQUIPO = "56900000001";

/** Un teléfono falso: guarda lo que manda el cliente y lo que «llegó» de Café. */
function telefonoFalso() {
  const mandados: MensajeDeMeta[] = [];
  const llegados: MensajeEnviado[] = [];
  let pagos = 0;
  return {
    mandados,
    llegados,
    enviar: async (m: MensajeDeMeta) => void mandados.push(m),
    enviados: async () => llegados,
    leidos: async () => [],
    pagarUltimo: async () => (pagos++ ? undefined : "khipu-1"),
  };
}

async function mundo() {
  const m = await aplicacionDePrueba(() => ({}));
  await m.configurarElNegocio();
  const telefono = telefonoFalso();
  const app = new Hono();
  crearSimulador({
    clientes: Object.values(CLIENTES_DE_EJEMPLO),
    equipo: EQUIPO,
    telefono,
    gasto: m.servicios.gasto,
    bandeja: {
      bandeja: m.almacenes.bandeja,
      clientes: m.almacenes.clientes,
      aviso: m.servicios.aviso,
      responder: m.servicios.responderDesdeBandeja,
      recuerdos: new RecuerdosDeClientes(m.almacenes.registros),
    },
    ahora: () => new Date("2026-10-16T15:00:00.000Z"),
  }).registrar(app);
  return { ...m, telefono, sim: app };
}

describe("el simulador local", () => {
  it("sirve la página con el teléfono y el panel del equipo", async () => {
    const { sim } = await mundo();
    const r = await sim.request("/");
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toContain("Teléfono del cliente");
    expect((await sim.request("/simulador/app.js")).status).toBe(200);
  });

  it("lo que escribe el cliente va al webhook y queda en el hilo esperando respuesta", async () => {
    const { sim, telefono } = await mundo();
    const r = await pedir(sim, "POST", "/simulador/api/mensaje", {
      telefono: ANA.telefono,
      tipo: "texto",
      texto: "hola",
    });
    expect(r.status).toBe(200);
    expect(telefono.mandados[0]).toMatchObject({
      from: ANA.telefono,
      type: "text",
    });
    const estado = await pedir(
      sim,
      "GET",
      `/simulador/api/estado?telefono=${ANA.telefono}`,
    );
    expect(estado.cuerpo.mensajes).toEqual([
      expect.objectContaining({ de: "cliente", texto: "hola" }),
    ]);
    expect(estado.cuerpo.estado).toBe("esperando");
    expect(estado.cuerpo.gasto).toMatchObject({ llamadas: 0 });
  });

  it("elegir una opción manda la respuesta interactiva con su id", async () => {
    const { sim, telefono } = await mundo();
    await pedir(sim, "POST", "/simulador/api/mensaje", {
      telefono: ANA.telefono,
      tipo: "eleccion",
      opcion: { origen: "boton", id: "confirmar", titulo: "Confirmar" },
    });
    expect(telefono.mandados[0]).toMatchObject({
      type: "interactive",
      interactive: { button_reply: { id: "confirmar" } },
    });
  });

  it("un teléfono que no es de la semilla o un mensaje vacío se explican", async () => {
    const { sim } = await mundo();
    const ajeno = await pedir(sim, "POST", "/simulador/api/mensaje", {
      telefono: "56999999999",
      texto: "hola",
    });
    expect(ajeno.status).toBe(400);
    const vacio = await pedir(sim, "POST", "/simulador/api/mensaje", {
      telefono: ANA.telefono,
      texto: "  ",
    });
    expect(vacio.cuerpo.error).toBe("escribe un mensaje");
  });

  it("simular el pago confirma el último cobro; sin cobro pendiente lo dice", async () => {
    const { sim } = await mundo();
    expect(
      (await pedir(sim, "POST", "/simulador/api/pagar", {})).cuerpo,
    ).toEqual({
      pagado: "khipu-1",
    });
    expect((await pedir(sim, "POST", "/simulador/api/pagar", {})).status).toBe(
      409,
    );
  });

  it("la bandeja muestra lo abierto, los avisos al equipo y responde los comandos", async () => {
    const { sim, telefono, almacenes } = await mundo();
    const cliente = await almacenes.clientes.porTelefono(ANA.telefono);
    const c = await almacenes.bandeja.registrarCliente({
      clienteId: cliente!.id,
      telefono: ANA.telefono,
      texto: "hola",
      ahora: new Date(),
    });
    await almacenes.bandeja.pausar(
      c.id,
      "El cliente pidió hablar con una persona",
    );
    telefono.llegados.push({
      id: "w1",
      para: EQUIPO,
      tipo: "template",
      plantilla: "handoff_alert",
      parametros: ["Ana Pérez", "pidió una persona"],
      en: "2026-10-16T15:00:00.000Z",
    });
    const estado = await pedir(
      sim,
      "GET",
      `/simulador/api/estado?telefono=${ANA.telefono}`,
    );
    expect(estado.cuerpo.bandeja).toEqual([
      expect.objectContaining({
        nombre: "Ana Pérez",
        estado: "pausada",
        motivo: "El cliente pidió hablar con una persona",
      }),
    ]);
    expect(estado.cuerpo.avisos[0].texto).toBe("Ana Pérez · pidió una persona");
    const sinNombre = await pedir(sim, "POST", "/simulador/api/bandeja", {
      args: ["tomar", c.id],
    });
    expect(sinNombre.cuerpo.error).toMatch(/--como/);
    const tomar = await pedir(sim, "POST", "/simulador/api/bandeja", {
      args: ["tomar", c.id, "--como", "Rodo"],
    });
    expect(tomar.cuerpo.lineas[0]).toContain("la lleva Rodo");
  });
});
