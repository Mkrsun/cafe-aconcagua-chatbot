import { fotoDe } from "../../src/catalogo/dominio/precio.js";
import { PerfilesDeCafe } from "../../src/catalogo/index.js";
import type { AvisoAlEquipo } from "../../src/bandeja/casos-de-uso/aviso-al-equipo.js";
import type { BaseDeFaq } from "../../src/faq/casos-de-uso/base-de-faq.js";
import { GastoMensual } from "../../src/modelo/casos-de-uso/gasto-mensual.js";
import { ModeloConLimite } from "../../src/modelo/casos-de-uso/modelo-con-limite.js";
import { CobrarPedido } from "../../src/pedidos/casos-de-uso/cobrar-pedido.js";
import { RegistrarPedido } from "../../src/pedidos/casos-de-uso/registrar-pedido.js";
import { Turno } from "../../src/turno/casos-de-uso/turno.js";
import type { Contexto } from "./contexto.js";

const dolares = (usd: number) => `US$${usd.toFixed(2)}`;

/** El Turn Agent con el modelo detrás del límite de gasto, que avisa al equipo por umbral. */
export function crearTurno(c: Contexto, aviso: AvisoAlEquipo, faq: BaseDeFaq) {
  const { config, almacenes: a, bordes, reloj } = c;
  const gasto = new GastoMensual({
    registros: a.registros,
    limiteUSD: config.modelo.limiteUSD,
    ...(config.modelo.tarifa ? { tarifa: config.modelo.tarifa } : {}),
    reloj,
    avisar: async (umbral, g) => {
      await aviso.notificar({
        tipo: "gasto",
        cliente: "Café Aconcagua Chatbot",
        motivo: `El chatbot usó el ${umbral} % del límite mensual del modelo`,
        resumen: `${dolares(g.usd)} de ${dolares(config.modelo.limiteUSD)} en ${g.mes}`,
      });
    },
  });
  const perfiles = new PerfilesDeCafe(a.registros);
  const registrar = new RegistrarPedido({ pedidos: a.pedidos, reloj });
  const cobrar = new CobrarPedido({
    pedidos: a.pedidos,
    reloj,
    ...(bordes.proveedorDePago ? { proveedor: bordes.proveedorDePago } : {}),
  });
  const turno = new Turno({
    modelo: new ModeloConLimite(bordes.modelo, gasto),
    registros: a.registros,
    catalogo: async () => fotoDe(await a.catalogo.listar()),
    tarifas: () => a.tarifas.listar(),
    faq: () => faq.publicadas(),
    perfiles: () => perfiles.leer(),
    registrarPedido: (p) => registrar.ejecutar(p),
    cobrar: (id) => cobrar.ejecutar(id),
    reloj,
    rol: config.rol,
  });
  return { turno, gasto };
}
