import { crearGraph } from "../../e2e/dobles/graph.js";
import { crearKhipu } from "../../e2e/dobles/khipu.js";
import { iniciarDobles } from "../../e2e/dobles/servidor.js";
import { exigirBaseArriba } from "../base-de-desarrollo.js";
import { direccionesLocales } from "../entorno-de-desarrollo.js";
import { bienvenida } from "./bienvenida.js";
import { entornoLocal } from "./entorno-local.js";
import { arrancarProducto } from "./producto.js";
import { exigirPuertoLibre } from "./puertos.js";

/** `pnpm local`: dobles de WhatsApp y Khipu, y el servidor real con el modelo real. */
async function main() {
  const direcciones = direccionesLocales(process.env);
  const entorno = entornoLocal(process.env, direcciones.dobles);
  await exigirBaseArriba(entorno.DATABASE_URL!);
  await exigirPuertoLibre(direcciones.puertoDelServidor, "CAFE_PUERTO");
  await exigirPuertoLibre(direcciones.puertoDeLosDobles, "CAFE_DOBLES_PUERTO");
  const dobles = await iniciarDobles({
    puerto: direcciones.puertoDeLosDobles,
    dobles: [crearGraph(), crearKhipu()],
  });
  const producto = await arrancarProducto(entorno, direcciones.servidor).catch(
    async (error: unknown) => {
      await dobles.cerrar();
      throw error;
    },
  );
  console.log(
    bienvenida({
      dobles: direcciones.dobles,
      modelo: entorno.CAFE_MODELO ?? "gpt-6-luna",
    }),
  );
  let cerrando = false;
  const cerrar = async () => {
    cerrando = true;
    await producto.cerrar();
    await dobles.cerrar();
    process.exit(0);
  };
  process.once("SIGINT", cerrar);
  process.once("SIGTERM", cerrar);
  await producto.detenido;
  if (cerrando) return;
  console.error("El servidor se detuvo: mira arriba por qué.");
  await dobles.cerrar();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
