import type { Entorno } from "../launcher/config/lectores.js";

/** El secreto de la app de Meta en local: la CLI firma el webhook con él. */
export const SECRETO_DE_DESARROLLO = "secreto-de-la-app-de-desarrollo";
/** El número del equipo que recibe los avisos en local (llegan al doble, no a un teléfono). */
export const EQUIPO_DE_EJEMPLO = "56900000001";

const puerto = (env: Entorno, nombre: string, porDefecto: number) =>
  Number(env[nombre]?.trim() || porDefecto);

/** Dónde escuchan el servidor (`CAFE_PUERTO`) y los dobles (`CAFE_DOBLES_PUERTO`) en local. */
export function direccionesLocales(env: Entorno) {
  const servidor = puerto(env, "CAFE_PUERTO", 8092);
  const dobles = puerto(env, "CAFE_DOBLES_PUERTO", 8093);
  return {
    puertoDelServidor: servidor,
    puertoDeLosDobles: dobles,
    servidor: `http://127.0.0.1:${servidor}`,
    dobles: `http://127.0.0.1:${dobles}`,
  };
}
