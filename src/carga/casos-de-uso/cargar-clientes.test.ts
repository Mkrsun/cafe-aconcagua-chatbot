import { describe, expect, it } from "vitest";
import { ClientesEnMemoria } from "../../clientes/adaptadores/clientes-en-memoria.js";
import { PoliticasEnMemoria } from "../../clientes/adaptadores/politicas-en-memoria.js";
import type { ClienteDefinido } from "../dominio/definiciones.js";
import { resumenVacio } from "../dominio/resumen.js";
import { cargarClientes } from "./cargar-clientes.js";

const ana: ClienteDefinido = {
  nombre: "Ana Pérez",
  tipo: "minorista",
  tramo: "minorista",
  telefonos: ["+56 9 1111 2222"],
  consentimiento: "otorgado",
  fuente: "pidió recibir avisos en la tienda",
};
const ahora = () => new Date("2026-10-16T12:00:00Z");

function mundo() {
  const clientes = new ClientesEnMemoria();
  const politicas = new PoliticasEnMemoria();
  const cargar = (lista: readonly ClienteDefinido[], r = resumenVacio()) =>
    cargarClientes({ clientes, politicas, ahora }, lista, r).then(() => r);
  return { clientes, politicas, cargar };
}

describe("cargar clientes", () => {
  it("crea la ficha con el teléfono normalizado y su consentimiento", async () => {
    const m = mundo();
    const r = await m.cargar([ana]);
    const cliente = await m.clientes.porTelefono("56911112222");
    expect(cliente).toMatchObject({ nombre: "Ana Pérez", tramo: "minorista" });
    expect(await m.politicas.de(cliente!.id)).toMatchObject({
      consentimiento: "otorgado",
      whatsapp: "otorgado",
      fuente: ana.fuente,
    });
    expect(r.cambios).toEqual([
      "cliente Ana Pérez creado",
      "consentimiento de Ana Pérez: otorgado",
    ]);
  });

  it("reconoce al cliente por su teléfono y actualiza solo lo que cambió", async () => {
    const m = mundo();
    await m.cargar([ana]);
    expect((await m.cargar([ana])).cambios).toEqual([]);
    const r = await m.cargar([
      {
        ...ana,
        tramo: "mayorista",
        tipo: "horeca",
        consentimiento: "retirado",
      },
    ]);
    expect(r.cambios).toEqual([
      "cliente Ana Pérez actualizado",
      "consentimiento de Ana Pérez: retirado",
    ]);
    expect(await m.clientes.listar()).toHaveLength(1);
    expect(await m.clientes.porTelefono("56911112222")).toMatchObject({
      tramo: "mayorista",
      tipo: "horeca",
    });
  });

  it("no toca a los clientes que no vienen en el archivo", async () => {
    const m = mundo();
    await m.cargar([ana]);
    await m.cargar([
      { ...ana, nombre: "Emporio Dos", telefonos: ["56933334444"] },
    ]);
    expect(await m.clientes.listar()).toHaveLength(2);
  });

  it("rechaza un cliente inválido antes de escribir nada", async () => {
    const m = mundo();
    await expect(
      m.cargar([ana, { ...ana, telefonos: ["12"] }]),
    ).rejects.toThrow(/teléfono/);
    expect(await m.clientes.listar()).toEqual([]);
  });
});
