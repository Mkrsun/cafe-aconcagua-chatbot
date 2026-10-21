import { afterAll } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../plataforma/test-support/base-de-pruebas.js";
import { CatalogoPostgres } from "./catalogo-postgres.js";
import { contratoDelCatalogo } from "./catalogo.contrato.js";
import { TarifasPostgres } from "./tarifas-postgres.js";
import { contratoDeTarifas } from "./tarifas.contrato.js";

const TABLAS = [
  "cafe.precios",
  "cafe.formatos",
  "cafe.familias",
  "cafe.auditoria",
  "cafe.zonas_de_despacho",
];

describirConPostgres("catálogo y despacho en PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);

  contratoDelCatalogo(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, TABLAS);
    return new CatalogoPostgres(pool);
  });

  contratoDeTarifas(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, TABLAS);
    return new TarifasPostgres(pool);
  });
});
