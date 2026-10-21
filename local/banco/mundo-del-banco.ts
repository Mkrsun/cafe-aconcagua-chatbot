import { createHmac } from "node:crypto";
import { leerConfiguracion } from "../../launcher/config/configuracion.js";
import { crearAplicacion } from "../../launcher/composicion/aplicacion.js";
import { cargarDefiniciones } from "../../src/carga/index.js";
import {
  FalloDelModelo,
  type IModelo,
} from "../../src/modelo/puertos/modelo.js";
import { KhipuFalso } from "../../src/pedidos/adaptadores/khipu-falso.js";
import { RelojFalso } from "../../src/plataforma/reloj-falso.js";
import { CanalEnMemoria } from "../../src/whatsapp/adaptadores/canal-en-memoria.js";
import { DEFINICIONES_DE_EJEMPLO } from "../semilla/definiciones-de-ejemplo.js";
import type { Escenario, TurnoDelBanco } from "./escenario.js";
import { legible } from "./legible.js";
import { conContador, terminoDe } from "./medir.js";

const SECRETO = "secreto-del-banco";
const EQUIPO = "56900000001";
/** Más que la espera máxima de agrupación: cada turno se despacha entero. */
const PASOS_DE_RELOJ = 6;
const MINUTO = 60_000;

const telefonoDe = (i: number) => `5697000${1000 + i}`;

/**
 * La aplicación completa en memoria (sin base) con el negocio de la semilla, WhatsApp y Khipu
 * falsos y el modelo que se le pase: lo que lee el cliente es exactamente lo que saldría.
 */
export async function mundoDelBanco(
  modelo: IModelo,
  escenarios: readonly Escenario[],
) {
  const config = leerConfiguracion({
    OPENAI_API_KEY: "sk-banco",
    CAFE_MODELO_TARIFA_USD_POR_MTOK: "1,0.1,4",
    CAFE_LIMITE_GASTO_USD_MES: "1000",
    META_ACCESS_TOKEN: "token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_VERIFY_TOKEN: "verificar",
    WHATSAPP_APP_SECRET: SECRETO,
    WHATSAPP_PAYMENT_TEMPLATE: "payment_received",
    WHATSAPP_HANDOFF_TEMPLATE: "handoff_alert",
    CAFE_EQUIPO_WHATSAPP: EQUIPO,
    KHIPU_API_KEY: "khipu",
  });
  // Martes al mediodía en Chile: dentro del horario de la FAQ de ejemplo.
  const reloj = new RelojFalso(new Date("2026-10-20T15:00:00.000Z"));
  const canal = new CanalEnMemoria();
  const { contado, tomar } = conContador(modelo);
  const app = await crearAplicacion({
    config,
    bordes: { modelo: contado, canal, proveedorDePago: new KhipuFalso() },
    reloj: reloj.ahora,
    dormir: async () => {},
  });
  const clientes = escenarios.map((e, i) => ({
    ...e.cliente,
    telefonos: [telefonoDe(i)],
    consentimiento: "otorgado" as const,
    fuente: "banco",
  }));
  await cargarDefiniciones(
    { ...app.almacenes, faq: app.servicios.faq, ahora: reloj.ahora },
    DEFINICIONES_DE_EJEMPLO,
    clientes,
  );
  let n = 0;
  async function webhook(from: string, textos: readonly string[]) {
    const messages = textos.map((body) => ({
      id: `wamid.in.${++n}`,
      from,
      type: "text",
      text: { body },
    }));
    const cuerpo = JSON.stringify({
      entry: [{ changes: [{ value: { messages } }] }],
    });
    const firma = `sha256=${createHmac("sha256", SECRETO).update(cuerpo).digest("hex")}`;
    const r = await app.app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": firma,
      },
      body: cuerpo,
    });
    if (r.status !== 200) throw new Error(`el webhook respondió ${r.status}`);
  }

  /** El equipo resuelve la conversación y pasan tres días: la próxima empieza de cero. */
  async function resolverYEsperar(telefono: string) {
    const cliente = await app.almacenes.clientes.porTelefono(telefono);
    const activa =
      cliente && (await app.almacenes.bandeja.obtenerActiva(cliente.id));
    if (activa) await app.almacenes.bandeja.resolver(activa.id);
    reloj.avanzar(3 * 24 * 60 * MINUTO);
  }

  async function conversar(e: Escenario): Promise<TurnoDelBanco[]> {
    const telefono = telefonoDe(escenarios.indexOf(e));
    const turnos: TurnoDelBanco[] = [];
    for (const paso of e.pasos) {
      if (paso.antes === "resolver") await resolverYEsperar(telefono);
      const cliente =
        typeof paso.cliente === "string" ? [paso.cliente] : [...paso.cliente];
      const [antes, antesEquipo] = [
        canal.a(telefono).length,
        canal.a(EQUIPO).length,
      ];
      await webhook(telefono, cliente);
      for (let k = 0; k < PASOS_DE_RELOJ; k++) {
        reloj.avanzar(MINUTO);
        await app.trabajos.despachar();
      }
      const chatbot = canal.a(telefono).slice(antes);
      const avisos = canal
        .a(EQUIPO)
        .slice(antesEquipo)
        .map((m) => m.texto);
      turnos.push({
        cliente,
        chatbot: chatbot.map(legible),
        avisosAlEquipo: avisos,
        llamadas: tomar(),
        termino: terminoDe(chatbot, avisos),
      });
    }
    return turnos;
  }
  return { conversar };
}
