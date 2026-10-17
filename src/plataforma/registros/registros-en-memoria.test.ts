import { RegistrosEnMemoria } from "./registros-en-memoria.js";
import { contratoDeRegistros } from "./registros.contrato.js";

contratoDeRegistros(async () => new RegistrosEnMemoria());
