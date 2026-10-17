import { afterAll } from "vitest";
import {
  baseDePruebas,
  cerrarBaseDePruebas,
  describirConPostgres,
  vaciar,
} from "../../plataforma/test-support/base-de-pruebas.js";
import { PedidosEnMemoria } from "./pedidos-en-memoria.js";
import { PedidosPostgres } from "./pedidos-postgres.js";
import { contratoDePedidos } from "./pedidos.contrato.js";

contratoDePedidos(async () => new PedidosEnMemoria());

describirConPostgres("pedidos en PostgreSQL", () => {
  afterAll(cerrarBaseDePruebas);
  contratoDePedidos(async () => {
    const pool = await baseDePruebas();
    await vaciar(pool, [
      "cafe.pedidos",
      "cafe.versiones_de_pedidos",
      "cafe.pagos",
    ]);
    return new PedidosPostgres(pool);
  });
});
