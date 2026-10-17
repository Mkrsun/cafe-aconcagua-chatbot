import {
  POLITICA_POR_DEFECTO,
  type CambioDePolitica,
  type PoliticaDeContacto,
} from "../dominio/politica.js";
import type { IPoliticasDeContacto } from "../puertos/clientes.js";

/** Las políticas de contacto en memoria del proceso: desarrollo y pruebas. */
export class PoliticasEnMemoria implements IPoliticasDeContacto {
  private readonly politicas = new Map<string, PoliticaDeContacto>();
  private readonly cambios = new Map<string, CambioDePolitica[]>();

  async de(clienteId: string) {
    return this.politicas.get(clienteId) ?? POLITICA_POR_DEFECTO;
  }

  async guardar(
    clienteId: string,
    politica: PoliticaDeContacto,
    actor: string,
  ) {
    const anterior = (await this.de(clienteId)).consentimiento;
    const en = new Date().toISOString();
    this.politicas.set(clienteId, {
      ...politica,
      actualizadaPor: actor,
      actualizadaEn: en,
    });
    const cambio = {
      anterior,
      consentimiento: politica.consentimiento,
      fuente: politica.fuente,
    };
    this.cambios.set(clienteId, [
      { ...cambio, actor, en },
      ...(this.cambios.get(clienteId) ?? []),
    ]);
  }

  async historial(clienteId: string) {
    return this.cambios.get(clienteId) ?? [];
  }
}
