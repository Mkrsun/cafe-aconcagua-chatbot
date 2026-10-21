import { ModeloOpenAI } from "../../src/modelo/adaptadores/modelo-openai.js";
import type { IModelo } from "../../src/modelo/puertos/modelo.js";
import { Khipu } from "../../src/pedidos/adaptadores/khipu.js";
import type { IProveedorDePago } from "../../src/pedidos/puertos/cobro.js";
import { CanalSinConfigurar } from "../../src/whatsapp/adaptadores/canal-sin-configurar.js";
import { CanalWhatsApp } from "../../src/whatsapp/adaptadores/canal-whatsapp.js";
import type { ICanal } from "../../src/whatsapp/puertos/canal.js";
import type { Configuracion } from "../config/configuracion.js";

/** Los bordes externos: en producción los reales; las pruebas pasan dobles. */
export interface Bordes {
  readonly modelo: IModelo;
  readonly canal: ICanal;
  /** Sin Khipu, el pedido confirmado lo cobra una persona. */
  readonly proveedorDePago?: IProveedorDePago;
}

export function bordesReales(config: Configuracion): Bordes {
  const { modelo, whatsapp, khipu } = config;
  return {
    modelo: new ModeloOpenAI({
      baseUrl: modelo.baseUrl,
      apiKey: modelo.apiKey,
      modelo: modelo.nombre,
      timeoutMs: modelo.timeoutMs,
      ...(modelo.reasoningEffort
        ? { reasoningEffort: modelo.reasoningEffort }
        : {}),
    }),
    canal: whatsapp
      ? new CanalWhatsApp(
          whatsapp.token,
          whatsapp.phoneNumberId,
          whatsapp.graphBase,
        )
      : new CanalSinConfigurar(),
    ...(khipu ? { proveedorDePago: new Khipu(khipu) } : {}),
  };
}
