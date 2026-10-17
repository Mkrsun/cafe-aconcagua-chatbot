import { expect, test } from "../soporte/prueba.js";
import { EMPORIO, sembrarNegocio } from "../soporte/sembrar.js";
import { EQUIPO } from "../soporte/servidor-cafe.js";

const MOTIVO = "El cliente pidió hablar con una persona";

/**
 * Crítica (b): el cliente pide una persona. Sale la plantilla de aviso al equipo, el cliente lo
 * sabe, la conversación queda pausada con su motivo y el equipo le responde con `pnpm bandeja`.
 */
test("derivación con aviso al equipo y respuesta desde la bandeja", async ({
  cafe,
}) => {
  await sembrarNegocio(cafe);
  await cafe
    .cliente(EMPORIO.telefono)
    .escribir("quiero hablar con una persona, por favor");

  await expect.poll(async () => (await cafe.enviados(EQUIPO)).length).toBe(1);
  expect((await cafe.enviados(EQUIPO))[0]).toMatchObject({
    plantilla: "handoff_alert",
    parametros: [
      `${EMPORIO.nombre} (${EMPORIO.telefono})`,
      MOTIVO,
      expect.any(String),
    ],
  });
  await expect
    .poll(async () => (await cafe.enviados(EMPORIO.telefono)).length)
    .toBe(1);
  expect((await cafe.enviados(EMPORIO.telefono))[0]?.texto).toContain(
    "le paso tu caso a la encargada",
  );
  expect(await cafe.llamadasAlModelo()).toEqual([]);

  const pendientes = await cafe.bandeja();
  expect(pendientes).toContain("[pausada]");
  expect(pendientes).toContain(EMPORIO.nombre);
  expect(pendientes).toContain(MOTIVO);

  const respuesta =
    "Hola, soy Glei: te llamo en cinco minutos para ver tu pedido.";
  expect(
    await cafe.bandeja(
      "responder",
      EMPORIO.telefono,
      "--como",
      "Glei",
      respuesta,
    ),
  ).toContain("Mensaje enviado");
  expect(await cafe.bandeja("ver", EMPORIO.telefono)).toContain(
    `Glei: ${respuesta}`,
  );
  expect(await cafe.bandeja()).toContain("la lleva Glei");
  await expect
    .poll(async () => (await cafe.enviados(EMPORIO.telefono)).length)
    .toBe(2);
  expect((await cafe.enviados(EMPORIO.telefono))[1]?.texto).toBe(respuesta);
});
