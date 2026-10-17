import type { ICanal, ResultadoEnvio } from "../puertos/canal.js";

/**
 * El canal cuando WhatsApp no está configurado (desarrollo): nada sale y quien envía lo sabe, así
 * El chatbot nunca dice "ya le avisé" sin haber avisado.
 */
export class CanalSinConfigurar implements ICanal {
  async enviar(): Promise<ResultadoEnvio> {
    return { enviado: false, error: "WhatsApp no está configurado" };
  }

  async marcarLeido(): Promise<void> {}
}
