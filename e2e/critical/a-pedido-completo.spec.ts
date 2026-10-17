import { decision } from "../soporte/decisiones.js";
import { expect, test } from "../soporte/prueba.js";
import { ANA, sembrarNegocio } from "../soporte/sembrar.js";

/**
 * Crítica (a): un pedido completo por WhatsApp. La ráfaga se responde una vez con la lista de
 * cafés, el cliente elige de la lista, el chatbot resume con «Confirmar», el cliente confirma,
 * recibe «Pagar», Khipu confirma y sale la plantilla de pago recibido. El equipo lo lee con
 * `pnpm bandeja`.
 */
test("pedido por WhatsApp de la ráfaga al pago, visto en la bandeja", async ({
  cafe,
}) => {
  await sembrarNegocio(cafe);
  await cafe.guionar(ANA.nombre, [
    decision({
      intent: "pedido",
      action: "RESPONDER",
      knownRefs: ["0025", "0028"],
      forma: { tipo: "lista", opciones: [], skus: ["0025", "0028"] },
      response: "¡Hola, Ana! Estos son nuestros Futaleufú:",
    }),
    decision({
      action: "PROPONER",
      changes: [{ sku: "0028", cantidad: 2 }],
      despacho: "Ñuñoa",
      response: "¡Buenísimo, Ana! Te dejo el resumen:",
    }),
  ]);
  const ana = cafe.cliente(ANA.telefono);

  await ana.escribir(
    "hola buenas",
    "quiero café para Ñuñoa",
    "¿qué futaleufú tienen?",
  );
  await expect
    .poll(async () => (await cafe.enviados(ANA.telefono)).length)
    .toBe(1);
  const llamadas = await cafe.llamadasAlModelo();
  expect(llamadas).toHaveLength(1);
  expect(llamadas[0]?.mensaje).toBe(
    "hola buenas\nquiero café para Ñuñoa\n¿qué futaleufú tienen?",
  );
  const [lista] = await cafe.enviados(ANA.telefono);
  expect(lista?.interactivo?.type).toBe("list");
  const fila = lista?.interactivo?.action?.sections?.[0]?.rows.find(
    (r) => r.id === "sku:0028",
  );
  expect(fila?.description).toContain("$9.990");

  await ana.elegirDeLista(fila!.id, fila!.title, fila!.description);
  await expect
    .poll(async () => (await cafe.enviados(ANA.telefono)).length)
    .toBe(2);
  const resumen = (await cafe.enviados(ANA.telefono))[1]!;
  expect(resumen.texto).toContain("Total: $23.970");
  expect(
    resumen.interactivo?.action?.buttons?.map((b) => b.reply.title),
  ).toEqual(["Confirmar", "Cambiar algo"]);

  await ana.elegirBoton("confirmar", "Confirmar");
  await expect
    .poll(async () => (await cafe.enviados(ANA.telefono)).length)
    .toBe(3);
  const pagar = (await cafe.enviados(ANA.telefono))[2]!;
  expect(pagar.interactivo?.type).toBe("cta_url");
  expect(pagar.interactivo?.action?.parameters?.display_text).toBe("Pagar");

  expect(await cafe.pagarEnKhipu("khipu-e2e-1")).toBe(200);
  await expect
    .poll(async () => (await cafe.enviados(ANA.telefono)).length)
    .toBe(4);
  expect((await cafe.enviados(ANA.telefono))[3]).toMatchObject({
    plantilla: "payment_received",
    parametros: [ANA.nombre, "$23.970"],
  });

  const hilo = await cafe.bandeja("ver", ANA.telefono);
  expect(hilo).toContain("Chatbot: ¡Hola, Ana! Estos son nuestros Futaleufú:");
  expect(hilo).toContain(`Cliente: [lista] ${fila!.title}`);
  expect(hilo).toContain("Responde: Confirmar · Cambiar algo");
  expect(hilo).toContain("Cliente: [botón] Confirmar");
  expect(hilo).toContain("Total: $23.970");
});
