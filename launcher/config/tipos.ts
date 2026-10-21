import type { TarifaDelModelo } from "../../src/modelo/dominio/costo.js";
import type { TiemposDeEspera } from "../../src/whatsapp/dominio/espera/tiempos.js";
import type { ConfiguracionDePlantilla } from "../../src/whatsapp/dominio/plantillas.js";

/** Todo lo que el producto lee del entorno, ya validado (README: variables de entorno). */
export interface Configuracion {
  readonly entorno: "desarrollo" | "produccion";
  readonly puerto: number;
  readonly databaseUrl?: string;
  readonly modelo: {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly nombre: string;
    readonly timeoutMs: number;
    readonly reasoningEffort?: string;
    readonly tarifa?: TarifaDelModelo;
    readonly limiteUSD: number;
  };
  readonly whatsapp?: {
    readonly token: string;
    readonly phoneNumberId: string;
    readonly verifyToken: string;
    readonly appSecret?: string;
    readonly graphBase: string;
  };
  readonly plantillas: {
    readonly pagoRecibido?: ConfiguracionDePlantilla;
    readonly avisoAlEquipo?: ConfiguracionDePlantilla;
  };
  readonly equipo: readonly string[];
  readonly rol: string;
  readonly tiempos: TiemposDeEspera;
  readonly despachoCadaMs: number;
  readonly khipu?: {
    readonly apiKey: string;
    readonly base: string;
    readonly notifyUrl?: string;
  };
}
