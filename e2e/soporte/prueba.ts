import { test as base } from "@playwright/test";
import { iniciarDobles } from "../dobles/servidor.js";
import { baseNueva, borrarBase } from "./base-de-datos.js";
import { Cafe } from "./cafe.js";
import { arrancarServidor } from "./servidor-cafe.js";

/**
 * Cada prueba tiene su propio producto: dobles, una base `cafe_test_e2e_*` recién creada (el
 * servidor la migra al arrancar) y el servidor real. Nada se comparte entre pruebas.
 */
export const test = base.extend<{ cafe: Cafe }>({
  cafe: async ({}, usar, info) => {
    const dobles = await iniciarDobles();
    const baseDeDatos = await baseNueva(`${info.workerIndex}_${info.testId}`);
    const servidor = await arrancarServidor(baseDeDatos, dobles.base);
    try {
      await usar(new Cafe(servidor, baseDeDatos, dobles.base));
    } finally {
      if (info.status !== info.expectedStatus)
        await info.attach("salida-del-servidor", { body: servidor.salida() });
      await servidor.cerrar();
      await dobles.cerrar();
      await borrarBase(baseDeDatos);
    }
  },
});

export { expect } from "@playwright/test";
