import { NEGOCIO_DE_PRUEBA } from "../../src/carga/test-support/negocio-de-prueba.js";
import { decision } from "../soporte/decisiones.js";
import { expect, test } from "../soporte/prueba.js";
import { ANA, sembrarNegocio } from "../soporte/sembrar.js";

/**
 * Crítica (c): el equipo cambia un precio en las definiciones, corre la carga y el chatbot cotiza
 * el nuevo. El modelo solo escribe el marcador `{{precio:0028}}`: el monto lo pone el sistema.
 */
test("el equipo cambia el precio y el chatbot cotiza el nuevo", async ({
  cafe,
}) => {
  await sembrarNegocio(cafe);
  await sembrarNegocio(cafe, {
    ...NEGOCIO_DE_PRUEBA,
    catalogo: NEGOCIO_DE_PRUEBA.catalogo.map((f) =>
      f.sku === "0028"
        ? { ...f, precios: { ...f.precios, minorista: 10990 } }
        : f,
    ),
  });

  await cafe.guionar(ANA.nombre, [
    decision({
      intent: "informacion",
      knownRefs: ["0028"],
      response: "El Futaleufú molido de 150 g está a {{precio:0028}}.",
    }),
  ]);
  await cafe
    .cliente(ANA.telefono)
    .escribir("¿cuánto vale el futaleufú molido?");
  await expect
    .poll(async () => (await cafe.enviados(ANA.telefono)).length)
    .toBe(1);
  const [cotizacion] = await cafe.enviados(ANA.telefono);
  expect(cotizacion?.texto).toContain("$10.990");
  expect(cotizacion?.texto).not.toContain("$9.990");
});
