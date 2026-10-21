import { ClientesEnMemoria } from "./clientes-en-memoria.js";
import { contratoDelCrm } from "./clientes.contrato.js";
import { PoliticasEnMemoria } from "./politicas-en-memoria.js";

contratoDelCrm(async () => ({
  clientes: new ClientesEnMemoria(),
  politicas: new PoliticasEnMemoria(),
}));
