import { ColaEnMemoria } from "./cola-en-memoria.js";
import { contratoDeLaCola } from "./cola.contrato.js";
import { EntrantesEnMemoria } from "./entrantes-en-memoria.js";
import { contratoDeEntrantes } from "./entrantes.contrato.js";

contratoDeLaCola(async () => {
  const cola = new ColaEnMemoria();
  return { cola, otra: cola };
});
contratoDeEntrantes(async (ms) => new EntrantesEnMemoria(ms));
