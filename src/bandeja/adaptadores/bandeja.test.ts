import { afterAll } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../plataforma/test-support/base-de-pruebas.js";
import { BandejaEnMemoria } from "./bandeja-en-memoria.js";
import { BandejaPostgres } from "./bandeja-postgres.js";
import { contratoDeLaBandeja } from "./bandeja.contrato.js";

contratoDeLaBandeja(async () => new BandejaEnMemoria());

describirConPostgres("bandeja en PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);
  contratoDeLaBandeja(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, ["cafe.conversaciones"]);
    return new BandejaPostgres(pool);
  });
});
