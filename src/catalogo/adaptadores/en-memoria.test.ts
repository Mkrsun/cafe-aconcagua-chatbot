import { CatalogoEnMemoria } from "./catalogo-en-memoria.js";
import { contratoDelCatalogo } from "./catalogo.contrato.js";
import { TarifasEnMemoria } from "./tarifas-en-memoria.js";
import { contratoDeTarifas } from "./tarifas.contrato.js";

contratoDelCatalogo(async () => new CatalogoEnMemoria());
contratoDeTarifas(async () => new TarifasEnMemoria());
