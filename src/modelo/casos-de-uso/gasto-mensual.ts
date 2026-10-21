import {
  claveDeRegistro,
  type IRegistros,
} from "../../plataforma/registros/puerto.js";
import type { Reloj } from "../../plataforma/reloj.js";
import { calcularCostoUSD, type TarifaDelModelo } from "../dominio/costo.js";
import {
  alertas,
  gastoVacio,
  mesDeChile,
  sumarConsumo,
  umbralCruzado,
  type Consumo,
  type GastoDelMes,
} from "../dominio/gasto.js";

export interface DepsGastoMensual {
  readonly registros: IRegistros;
  readonly limiteUSD: number;
  /** Sin tarifa se cuentan tokens pero no dólares: el límite no puede cortar. */
  readonly tarifa?: TarifaDelModelo;
  readonly reloj: Reloj;
  /** Avisa al equipo al cruzar 50, 80 o 100 % del límite. Un fallo del aviso no tumba la suma. */
  readonly avisar?: (umbral: number, gasto: GastoDelMes) => Promise<void>;
}

/**
 * El gasto mensual del modelo: un cortacircuitos contra bugs, no contabilidad. El
 * acumulado vive en los registros duraderos, uno por mes; el mes sale del reloj.
 */
export class GastoMensual {
  constructor(private readonly deps: DepsGastoMensual) {}

  async registrar(consumo: Omit<Consumo, "costoUSD">): Promise<void> {
    const { tarifa, limiteUSD } = this.deps;
    const costoUSD =
      consumo.tokens && tarifa && calcularCostoUSD(consumo.tokens, tarifa);
    const clave = this.clave();
    const { antes, despues } = await this.deps.registros.bajoLlave(
      clave,
      async () => {
        const actual = await this.leer(clave);
        const nuevo = sumarConsumo(actual, {
          ...consumo,
          ...(costoUSD === undefined ? {} : { costoUSD }),
        });
        await this.deps.registros.guardar(clave, nuevo);
        return { antes: actual, despues: nuevo };
      },
    );
    const umbral = umbralCruzado(antes.usd, despues.usd, limiteUSD);
    if (umbral !== undefined)
      await this.deps
        .avisar?.(umbral, despues)
        .catch((error: unknown) =>
          console.warn("no se pudo avisar el umbral de gasto", error),
        );
  }

  async superado(): Promise<boolean> {
    return (await this.leer(this.clave())).usd >= this.deps.limiteUSD;
  }

  async delMes() {
    const gasto = await this.leer(this.clave());
    const { limiteUSD, tarifa } = this.deps;
    return {
      ...gasto,
      limiteUSD,
      superado: gasto.usd >= limiteUSD,
      conTarifa: tarifa !== undefined,
      alertas: alertas(gasto.usd, limiteUSD),
    };
  }

  private clave() {
    return claveDeRegistro("llm-gasto-mensual", this.mes());
  }

  private mes() {
    return mesDeChile(this.deps.reloj());
  }

  private async leer(clave: string): Promise<GastoDelMes> {
    const guardado =
      await this.deps.registros.leer<Partial<GastoDelMes>>(clave);
    return { ...gastoVacio(this.mes()), ...guardado };
  }
}
