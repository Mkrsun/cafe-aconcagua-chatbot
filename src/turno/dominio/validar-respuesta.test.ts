import { describe, expect, it } from "vitest";
import { fotoDePrueba } from "../test-support/catalogo-de-prueba.js";
import { violaciones } from "./validar-respuesta.js";

const foto = fotoDePrueba();
const revisar = (texto: string, hayZona = false) =>
  violaciones(texto, { foto, hayZona }).map((v) => v.codigo);

describe("lo que el modelo no puede escribir", () => {
  it.each([
    ["Está a $9.990", "monto_escrito"],
    ["Son 9.990 pesos", "monto_escrito"],
    ["Te sale en 10 lucas", "monto_escrito"],
    ["Precio: {{precio:9999}}", "marcador_invalido"],
    ["Tu pedido quedó pagado", "estado_afirmado"],
    ["Ya despachamos tu pedido", "estado_afirmado"],
    ["Paga en https://khipu.com/x", "enlace_en_prosa"],
    ["El despacho: {{despacho}}", "despacho_sin_zona"],
  ])("«%s» ⇒ %s", (texto, codigo) => {
    expect(revisar(texto)).toContain(codigo);
  });

  it.each([
    "No tengo registrada tu dirección",
    "No puedo marcarlo como pagado",
    "¿Lo quieres en 150 g o en 250 g?",
    "Está a {{precio:0025}}",
    "Atendemos de 10:00 a 14:00",
  ])("«%s» pasa", (texto) => {
    expect(revisar(texto)).toEqual([]);
  });

  it("{{despacho}} pasa si hay zona", () => {
    expect(revisar("{{despacho}}", true)).toEqual([]);
  });
});
