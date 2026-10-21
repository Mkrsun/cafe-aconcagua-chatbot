import { describe, expect, it } from "vitest";
import { Conflicto } from "../../plataforma/errores.js";
import type { Cliente } from "../dominio/cliente.js";
import { consentimientoDeWhatsApp } from "../dominio/politica.js";
import type { IClientes, IPoliticasDeContacto } from "../puertos/clientes.js";

export const clienteDePrueba = (cambios: Partial<Cliente> = {}): Cliente => ({
  id: "cli_1",
  nombre: "Emporio Uno",
  tipo: "mayorista-tienda",
  tramo: "mayorista",
  estado: "activo",
  telefonos: ["56911112222"],
  creadoEn: "2026-10-01T12:00:00.000Z",
  actualizadoEn: "2026-10-01T12:00:00.000Z",
  ...cambios,
});

export interface MundoDelCrm {
  readonly clientes: IClientes;
  readonly politicas: IPoliticasDeContacto;
}

/** El contrato del CRM: lo pasan la memoria y PostgreSQL. */
export function contratoDelCrm(crear: () => Promise<MundoDelCrm>) {
  describe("contrato de clientes y políticas", () => {
    it("guarda y encuentra por id y por teléfono en cualquier formato", async () => {
      const { clientes } = await crear();
      await clientes.guardar(clienteDePrueba());
      expect(await clientes.porId("cli_1")).toEqual(clienteDePrueba());
      expect((await clientes.porTelefono("+56 9 1111 2222"))?.id).toBe("cli_1");
      expect(await clientes.porTelefono("56900000000")).toBeUndefined();
      expect(await clientes.porId("nadie")).toBeUndefined();
    });

    it("actualiza y reemplaza los teléfonos; un teléfono de otro es un conflicto", async () => {
      const { clientes } = await crear();
      await clientes.guardar(clienteDePrueba());
      await clientes.guardar(
        clienteDePrueba({
          nombre: "Emporio Uno SpA",
          telefonos: ["56922223333"],
        }),
      );
      expect((await clientes.porTelefono("56922223333"))?.nombre).toBe(
        "Emporio Uno SpA",
      );
      expect(await clientes.porTelefono("56911112222")).toBeUndefined();
      await expect(
        clientes.guardar(
          clienteDePrueba({ id: "cli_2", telefonos: ["56922223333"] }),
        ),
      ).rejects.toThrow(Conflicto);
    });

    it("lista y filtra por nombre o teléfono", async () => {
      const { clientes } = await crear();
      await clientes.guardar(clienteDePrueba());
      await clientes.guardar(
        clienteDePrueba({
          id: "cli_2",
          nombre: "Café Dos",
          telefonos: ["56933334444"],
        }),
      );
      expect((await clientes.listar()).map((c) => c.id)).toEqual([
        "cli_1",
        "cli_2",
      ]);
      expect((await clientes.listar("emporio")).map((c) => c.id)).toEqual([
        "cli_1",
      ]);
      expect((await clientes.listar("3333")).map((c) => c.id)).toEqual([
        "cli_2",
      ]);
    });

    it("sin política el consentimiento es desconocido; guardar deja el evento", async () => {
      const { clientes, politicas } = await crear();
      await clientes.guardar(clienteDePrueba());
      expect((await politicas.de("cli_1")).consentimiento).toBe("desconocido");
      const nueva = {
        ...(await politicas.de("cli_1")),
        consentimiento: "otorgado" as const,
        whatsapp: "retirado" as const,
        fuente: "lo pidió por teléfono",
      };
      await politicas.guardar("cli_1", nueva, "Glei");
      expect(await politicas.de("cli_1")).toMatchObject({
        consentimiento: "otorgado",
        whatsapp: "retirado",
        actualizadaPor: "Glei",
      });
      expect(await politicas.historial("cli_1")).toEqual([
        expect.objectContaining({
          anterior: "desconocido",
          consentimiento: "otorgado",
          actor: "Glei",
        }),
      ]);
    });

    it("guardar reemplaza la política: sin WhatsApp aparte, rige el general", async () => {
      const { clientes, politicas } = await crear();
      await clientes.guardar(clienteDePrueba());
      const base = await politicas.de("cli_1");
      await politicas.guardar(
        "cli_1",
        {
          ...base,
          consentimiento: "otorgado",
          whatsapp: "retirado",
          fuente: "llamada",
        },
        "Glei",
      );
      await politicas.guardar(
        "cli_1",
        {
          ...base,
          consentimiento: "otorgado",
          fuente: "lo confirmó por escrito",
        },
        "Glei",
      );
      const politica = await politicas.de("cli_1");
      expect(politica.whatsapp).toBeUndefined();
      expect(consentimientoDeWhatsApp(politica)).toBe("otorgado");
      expect((await politicas.historial("cli_1")).map((c) => c.fuente)).toEqual(
        ["lo confirmó por escrito", "llamada"],
      );
    });
  });
}
