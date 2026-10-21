import type { Reloj } from "../../src/plataforma/reloj.js";
import type { Configuracion } from "../config/tipos.js";
import type { Almacenes } from "./almacenes.js";
import type { Bordes } from "./bordes.js";

/** Lo que necesita la composición de los casos de uso. */
export interface Contexto {
  readonly config: Configuracion;
  readonly almacenes: Almacenes;
  readonly bordes: Bordes;
  readonly reloj: Reloj;
  readonly dormir: (ms: number) => Promise<void>;
}
