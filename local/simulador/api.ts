import type { Hono } from "hono";
import { ejecutarBandeja } from "../../launcher/operacion/bandeja/comandos.js";
import { explicar } from "../../launcher/operacion/bandeja/explicar.js";
import type { ClienteDeEjemplo } from "../clientes-de-ejemplo.js";
import type { OpcionElegible } from "../conversar/mostrar.js";
import {
  mensajeDeEleccion,
  mensajeDeTexto,
  mensajeDeUbicacion,
  type MensajeDeMeta,
} from "../conversar/webhook.js";
import { estadoDelSimulador, type FuentesDelEstado } from "./estado.js";
import type { MensajeDelCliente } from "./hilo.js";
import { registrarPagina } from "./pagina.js";

export interface DepsDelSimulador extends FuentesDelEstado {
  readonly clientes: readonly ClienteDeEjemplo[];
  readonly ahora?: () => Date;
}

type Pedido = {
  telefono?: string;
  tipo?: string;
  texto?: string;
  opcion?: OpcionElegible;
};

/**
 * El simulador local: un teléfono de cliente y la bandeja del equipo en el navegador. Vive en los
 * dobles de `pnpm local` (127.0.0.1); el servidor del producto sigue sin pantallas ni API.
 */
export function crearSimulador(deps: DepsDelSimulador) {
  const ahora = deps.ahora ?? (() => new Date());
  const escritos = new Map<string, MensajeDelCliente[]>();
  const numero = (t: unknown) => {
    const cliente = deps.clientes.find((c) => c.telefono === t);
    if (!cliente) throw new Error("ese cliente no es de la semilla");
    return cliente.telefono;
  };
  const anotar = (telefono: string, m: MensajeDeMeta, texto: string) => {
    const lista = escritos.get(telefono) ?? [];
    lista.push({ id: m.id, texto, en: ahora().toISOString() });
    escritos.set(telefono, lista);
  };
  const mensajeDe = (telefono: string, p: Pedido) => {
    if (p.tipo === "ubicacion")
      return {
        m: mensajeDeUbicacion(telefono),
        texto: "📍 Ubicación compartida",
      };
    if (p.tipo === "eleccion" && p.opcion)
      return {
        m: mensajeDeEleccion(telefono, p.opcion),
        texto: p.opcion.titulo,
      };
    const texto = (p.texto ?? "").trim();
    if (!texto) throw new Error("escribe un mensaje");
    return { m: mensajeDeTexto(telefono, texto), texto };
  };

  return {
    registrar(app: Hono) {
      registrarPagina(app);
      app.get("/simulador/api/clientes", (c) => c.json(deps.clientes));
      app.get("/simulador/api/estado", async (c) => {
        try {
          const telefono = numero(c.req.query("telefono"));
          const propios = escritos.get(telefono) ?? [];
          return c.json(await estadoDelSimulador(deps, telefono, propios));
        } catch (error) {
          return c.json({ error: explicar(error) }, 400);
        }
      });
      app.post("/simulador/api/mensaje", async (c) => {
        const p = await c.req.json<Pedido>();
        try {
          const telefono = numero(p.telefono);
          const { m, texto } = mensajeDe(telefono, p);
          await deps.telefono.enviar(m);
          anotar(telefono, m, texto);
          return c.json({ ok: true });
        } catch (error) {
          return c.json({ error: explicar(error) }, 400);
        }
      });
      app.post("/simulador/api/pagar", async (c) => {
        const id = await deps.telefono.pagarUltimo();
        if (!id)
          return c.json({ error: "No hay ningún cobro pendiente." }, 409);
        return c.json({ pagado: id });
      });
      app.post("/simulador/api/bandeja", async (c) => {
        const p = await c.req.json<{ args?: unknown }>();
        const args = Array.isArray(p.args) ? p.args.map(String) : [];
        try {
          return c.json({ lineas: await ejecutarBandeja(deps.bandeja, args) });
        } catch (error) {
          return c.json({ error: explicar(error) }, 400);
        }
      });
    },
  };
}
