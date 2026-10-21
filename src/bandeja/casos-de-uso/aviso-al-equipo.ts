import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import { soloDigitos } from "../../plataforma/telefono.js";
import {
  plantillaDeAvisoAlEquipo,
  type ConfiguracionDePlantilla,
} from "../../whatsapp/dominio/plantillas.js";
import {
  claveUltimoEntranteDeTelefono,
  dentroDeLaVentana,
  VENTANA_MS,
} from "../../whatsapp/dominio/ventana.js";
import type { ICanal } from "../../whatsapp/puertos/canal.js";
import { textoDelAviso, type Aviso } from "../dominio/aviso.js";

export interface DepsAvisoAlEquipo {
  readonly canal: ICanal;
  readonly registros: IRegistros;
  /** `CAFE_EQUIPO_WHATSAPP`. */
  readonly numeros: readonly string[];
  /** `WHATSAPP_HANDOFF_TEMPLATE`; sin ella, texto libre solo dentro de la ventana del número. */
  readonly plantilla?: ConfiguracionDePlantilla;
  readonly reloj: Reloj;
}

/**
 * El aviso al equipo por WhatsApp. Un aviso por episodio, marcado solo si salió;
 * basta que un número lo reciba. Nunca lanza: lo que no salió devuelve `false`.
 */
export class AvisoAlEquipo {
  private readonly numeros: readonly string[];

  constructor(private readonly deps: DepsAvisoAlEquipo) {
    this.numeros = deps.numeros.map(soloDigitos).filter(Boolean);
  }

  async notificar(aviso: Aviso): Promise<boolean> {
    try {
      const marca =
        aviso.conversacionId && this.marca(aviso.conversacionId, aviso.tipo);
      if (marca && (await this.yaAvisado(marca))) return true;
      const registrado = await this.enviar(aviso);
      if (registrado && marca)
        await this.deps.registros.guardar(marca, {
          at: this.deps.reloj().toISOString(),
        });
      return registrado;
    } catch (error) {
      console.warn("el aviso al equipo falló", error);
      return false;
    }
  }

  /** Cierra el episodio (reanudar o resolver): la próxima derivación vuelve a avisar. */
  async olvidar(conversacionId: string): Promise<void> {
    for (const tipo of ["traspaso", "reclamo"] as const)
      await this.deps.registros.guardar(this.marca(conversacionId, tipo), null);
  }

  private async enviar(aviso: Aviso): Promise<boolean> {
    const { plantilla, canal } = this.deps;
    const destinos = plantilla ? this.numeros : await this.enLaVentana();
    const texto = textoDelAviso(aviso);
    const resultados = await Promise.all(
      destinos.map((telefono) =>
        canal
          .enviar({
            telefono,
            texto,
            ...(plantilla
              ? { plantilla: plantillaDeAvisoAlEquipo(plantilla, aviso) }
              : {}),
          })
          .catch(() => ({ enviado: false })),
      ),
    );
    return resultados.some((r) => r.enviado);
  }

  private async enLaVentana(): Promise<readonly string[]> {
    const ahora = this.deps.reloj();
    const dentro = await Promise.all(
      this.numeros.map(async (n) =>
        dentroDeLaVentana(
          await this.deps.registros.leer(claveUltimoEntranteDeTelefono(n)),
          ahora,
        ),
      ),
    );
    return this.numeros.filter((_, i) => dentro[i]);
  }

  private async yaAvisado(marca: string) {
    const previa = await this.deps.registros.leer<{ at: string } | null>(marca);
    return (
      !!previa &&
      this.deps.reloj().getTime() - Date.parse(previa.at) < VENTANA_MS
    );
  }

  /** El informativo de un reclamo tiene su propia marca: no calla un traspaso posterior. */
  private marca(conversacionId: string, tipo: Aviso["tipo"]) {
    const clase = tipo === "reclamo" ? "reclamo" : "urgente";
    return claveDeRegistro("aviso-al-equipo", conversacionId, clase);
  }
}
