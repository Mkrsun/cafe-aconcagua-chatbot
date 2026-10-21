import { afterAll } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../plataforma/test-support/base-de-pruebas.js";
import { ColaPostgres } from "./cola-postgres.js";
import { contratoDeLaCola } from "./cola.contrato.js";
import { EntrantesPostgres } from "./entrantes-postgres.js";
import { contratoDeEntrantes } from "./entrantes.contrato.js";

describirConPostgres("WhatsApp en PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);

  contratoDeLaCola(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, ["cafe.lotes_entrantes", "cafe.mensajes_entrantes"]);
    return { cola: new ColaPostgres(pool), otra: new ColaPostgres(pool) };
  });

  contratoDeEntrantes(async (ms) => {
    const pool = await baseDePruebas();
    await vaciar(pool, ["cafe.mensajes_recibidos", "cafe.cartas_muertas"]);
    return new EntrantesPostgres(pool, ms);
  });
});
