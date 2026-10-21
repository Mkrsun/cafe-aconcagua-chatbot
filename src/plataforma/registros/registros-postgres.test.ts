import { afterAll, beforeAll } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../test-support/base-de-pruebas.js";
import { RegistrosPostgres } from "./registros-postgres.js";
import { contratoDeRegistros } from "./registros.contrato.js";

describirConPostgres("registros en PostgreSQL", () => {
  beforeAll(async () => {
    await vaciar(await baseDePruebas(), ["cafe.registros"]);
  });
  afterAll(cerrarBaseDePruebas);
  contratoDeRegistros(async () => new RegistrosPostgres(await baseDePruebas()));
});
