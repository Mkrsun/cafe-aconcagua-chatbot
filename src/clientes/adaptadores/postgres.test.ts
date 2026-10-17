import { afterAll, expect, it } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../plataforma/test-support/base-de-pruebas.js";
import { ClientesPostgres } from "./clientes-postgres.js";
import { clienteDePrueba, contratoDelCrm } from "./clientes.contrato.js";
import { PoliticasPostgres } from "./politicas-postgres.js";

const TABLAS = [
  "cafe.cambios_de_consentimiento",
  "cafe.politicas_de_contacto",
  "cafe.telefonos_de_clientes",
  "cafe.clientes",
];

async function crmVacio() {
  const pool = await baseDePruebas();
  await vaciar(pool, TABLAS);
  return pool;
}

describirConPostgres("CRM en PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);

  contratoDelCrm(async () => {
    const pool = await crmVacio();
    return {
      clientes: new ClientesPostgres(pool),
      politicas: new PoliticasPostgres(pool),
    };
  });

  it("los teléfonos se guardan como dígitos y el historial no se reescribe", async () => {
    const pool = await crmVacio();
    await new ClientesPostgres(pool).guardar(clienteDePrueba());
    const politicas = new PoliticasPostgres(pool);
    const politica = {
      ...(await politicas.de("cli_1")),
      consentimiento: "otorgado" as const,
    };
    await politicas.guardar("cli_1", politica, "Glei");
    const { rows } = await pool.query(
      "SELECT telefono FROM cafe.telefonos_de_clientes",
    );
    expect(rows).toEqual([{ telefono: "56911112222" }]);
    await expect(
      pool.query("UPDATE cafe.cambios_de_consentimiento SET actor = 'otro'"),
    ).rejects.toThrow(/no se modifica/);
  });
});
