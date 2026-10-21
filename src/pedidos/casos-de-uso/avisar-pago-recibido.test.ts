import { describe, expect, it } from "vitest";
import { RegistrosEnMemoria } from "../../plataforma/registros/registros-en-memoria.js";
import { BandejaEnMemoria } from "../../bandeja/adaptadores/bandeja-en-memoria.js";
import { ClientesEnMemoria } from "../../clientes/adaptadores/clientes-en-memoria.js";
import { PoliticasEnMemoria } from "../../clientes/adaptadores/politicas-en-memoria.js";
import { POLITICA_POR_DEFECTO } from "../../clientes/dominio/politica.js";
import { CanalEnMemoria } from "../../whatsapp/adaptadores/canal-en-memoria.js";
import { claveUltimoEntranteDeCliente } from "../../whatsapp/dominio/ventana.js";
import { PedidosEnMemoria } from "../adaptadores/pedidos-en-memoria.js";
import { pedidoDePrueba } from "../test-support/pedido-de-prueba.js";
import { AvisarPagoRecibido } from "./avisar-pago-recibido.js";
import { RegistrarPedido } from "./registrar-pedido.js";

const reloj = () => new Date("2026-10-16T12:00:00.000Z");

async function mundo(
  opciones: { plantilla?: boolean; ventana?: boolean } = {},
) {
  const pedidos = new PedidosEnMemoria();
  await new RegistrarPedido({ pedidos, reloj }).ejecutar(pedidoDePrueba());
  const clientes = new ClientesEnMemoria([
    {
      id: "cli_1",
      nombre: "Ana",
      tipo: "minorista",
      tramo: "minorista",
      estado: "activo",
      telefonos: ["56911112222"],
      creadoEn: "2026-10-01T00:00:00.000Z",
      actualizadoEn: "2026-10-01T00:00:00.000Z",
    },
  ]);
  const politicas = new PoliticasEnMemoria();
  const registros = new RegistrosEnMemoria();
  if (opciones.ventana)
    await registros.guardar(claveUltimoEntranteDeCliente("cli_1"), {
      at: "2026-10-16T11:00:00Z",
    });
  const canal = new CanalEnMemoria();
  const bandeja = new BandejaEnMemoria();
  await bandeja.registrarCliente({
    clienteId: "cli_1",
    telefono: "56911112222",
    texto: "sí",
    ahora: reloj(),
  });
  const avisar = new AvisarPagoRecibido({
    pedidos,
    clientes,
    politicas,
    registros,
    canal,
    bandeja,
    reloj,
    ...(opciones.plantilla === false
      ? {}
      : { plantilla: { nombre: "payment_received", idioma: "es" } }),
  });
  return { avisar, canal, politicas, bandeja };
}

describe("el aviso de pago recibido", () => {
  it("sale como plantilla con nombre y monto, una sola vez, y queda en la bandeja", async () => {
    const { avisar, canal, bandeja } = await mundo();
    expect(await avisar.ejecutar("ped_1")).toBe(true);
    expect(await avisar.ejecutar("ped_1")).toBe(true);
    expect(canal.enviados).toHaveLength(1);
    expect(canal.enviados[0]?.plantilla).toEqual({
      nombre: "payment_received",
      idioma: "es",
      parametros: ["Ana", "$23.970"],
    });
    const conv = await bandeja.obtenerActiva("cli_1");
    expect(conv?.mensajes.at(-1)).toMatchObject({
      autor: "chatbot",
      texto: expect.stringContaining("$23.970"),
    });
  });

  it("no sale si el cliente retiró su consentimiento", async () => {
    const { avisar, canal, politicas } = await mundo();
    await politicas.guardar(
      "cli_1",
      { ...POLITICA_POR_DEFECTO, consentimiento: "retirado" },
      "Glei",
    );
    expect(await avisar.ejecutar("ped_1")).toBe(false);
    expect(canal.enviados).toEqual([]);
  });

  it("sin plantilla, texto libre solo dentro de la ventana de 24 h", async () => {
    const fuera = await mundo({ plantilla: false });
    expect(await fuera.avisar.ejecutar("ped_1")).toBe(false);
    expect(fuera.canal.enviados).toEqual([]);
    const dentro = await mundo({ plantilla: false, ventana: true });
    expect(await dentro.avisar.ejecutar("ped_1")).toBe(true);
    expect(dentro.canal.enviados[0]?.plantilla).toBeUndefined();
  });
});
