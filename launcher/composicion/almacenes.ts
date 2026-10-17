import type pg from "pg";
import { RegistrosEnMemoria } from "../../src/plataforma/registros/registros-en-memoria.js";
import { RegistrosPostgres } from "../../src/plataforma/registros/registros-postgres.js";
import { BandejaEnMemoria } from "../../src/bandeja/adaptadores/bandeja-en-memoria.js";
import { BandejaPostgres } from "../../src/bandeja/adaptadores/bandeja-postgres.js";
import { CatalogoEnMemoria } from "../../src/catalogo/adaptadores/catalogo-en-memoria.js";
import { CatalogoPostgres } from "../../src/catalogo/adaptadores/catalogo-postgres.js";
import { TarifasEnMemoria } from "../../src/catalogo/adaptadores/tarifas-en-memoria.js";
import { TarifasPostgres } from "../../src/catalogo/adaptadores/tarifas-postgres.js";
import { ClientesEnMemoria } from "../../src/clientes/adaptadores/clientes-en-memoria.js";
import { ClientesPostgres } from "../../src/clientes/adaptadores/clientes-postgres.js";
import { PoliticasEnMemoria } from "../../src/clientes/adaptadores/politicas-en-memoria.js";
import { PoliticasPostgres } from "../../src/clientes/adaptadores/politicas-postgres.js";
import { PedidosEnMemoria } from "../../src/pedidos/adaptadores/pedidos-en-memoria.js";
import { PedidosPostgres } from "../../src/pedidos/adaptadores/pedidos-postgres.js";
import { ColaEnMemoria } from "../../src/whatsapp/adaptadores/cola-en-memoria.js";
import { ColaPostgres } from "../../src/whatsapp/adaptadores/cola-postgres.js";
import { EntrantesEnMemoria } from "../../src/whatsapp/adaptadores/entrantes-en-memoria.js";
import { EntrantesPostgres } from "../../src/whatsapp/adaptadores/entrantes-postgres.js";

/** Los almacenes: PostgreSQL con base de datos; en memoria sin ella (solo desarrollo y pruebas). */
export function crearAlmacenes(pool?: pg.Pool) {
  if (pool)
    return {
      registros: new RegistrosPostgres(pool),
      bandeja: new BandejaPostgres(pool),
      catalogo: new CatalogoPostgres(pool),
      tarifas: new TarifasPostgres(pool),
      clientes: new ClientesPostgres(pool),
      politicas: new PoliticasPostgres(pool),
      pedidos: new PedidosPostgres(pool),
      cola: new ColaPostgres(pool),
      entrantes: new EntrantesPostgres(pool),
    };
  const pedidos = new PedidosEnMemoria();
  return {
    registros: new RegistrosEnMemoria(),
    bandeja: new BandejaEnMemoria(),
    catalogo: new CatalogoEnMemoria(),
    tarifas: new TarifasEnMemoria(),
    clientes: new ClientesEnMemoria(),
    politicas: new PoliticasEnMemoria(),
    pedidos,
    cola: new ColaEnMemoria(),
    entrantes: new EntrantesEnMemoria(),
  };
}

export type Almacenes = ReturnType<typeof crearAlmacenes>;
