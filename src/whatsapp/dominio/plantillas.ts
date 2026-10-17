import { pesos } from "../../plataforma/pesos.js";

/** Una plantilla aprobada en Meta, por nombre desde el entorno (nunca en el código). */
export interface ConfiguracionDePlantilla {
  readonly nombre: string;
  readonly idioma: string;
}

export interface PlantillaSaliente extends ConfiguracionDePlantilla {
  /** Parámetros del cuerpo, en orden; los pone el sistema, nunca el modelo. */
  readonly parametros: readonly string[];
}

/** Meta rechaza saltos de línea y textos largos en los parámetros. */
export const enUnaLinea = (texto: string, maximo: number) => {
  const plano = texto.replace(/\s+/g, " ").trim();
  return [...plano].length > maximo
    ? `${[...plano].slice(0, maximo - 1).join("")}…`
    : plano;
};

/** «Pago recibido»: {{1}} nombre del cliente, {{2}} monto pagado. */
export const plantillaDePagoRecibido = (
  config: ConfiguracionDePlantilla,
  nombre: string,
  montoClp: number,
): PlantillaSaliente => ({
  ...config,
  parametros: [enUnaLinea(nombre, 60), pesos(montoClp)],
});

/** «Aviso al equipo»: {{1}} cliente, {{2}} motivo, {{3}} resumen. */
export const plantillaDeAvisoAlEquipo = (
  config: ConfiguracionDePlantilla,
  aviso: {
    readonly cliente: string;
    readonly motivo: string;
    readonly resumen: string;
  },
): PlantillaSaliente => ({
  ...config,
  parametros: [
    enUnaLinea(aviso.cliente, 120),
    enUnaLinea(aviso.motivo, 160),
    enUnaLinea(aviso.resumen, 400),
  ],
});
