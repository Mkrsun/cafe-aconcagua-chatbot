import type {
  IModelo,
  RespuestaDelModelo,
  SolicitudAlModelo,
} from "../puertos/modelo.js";

/** Un modelo guionado: devuelve lo que diga `responder` (o lanza lo que lance). */
export class ModeloFalso implements IModelo {
  readonly llamadas: SolicitudAlModelo[] = [];

  constructor(
    private readonly responder: (solicitud: SolicitudAlModelo) => unknown,
  ) {}

  async completar(solicitud: SolicitudAlModelo): Promise<RespuestaDelModelo> {
    this.llamadas.push(solicitud);
    const json = this.responder(solicitud);
    return {
      json,
      metricas: {
        inputTokens: 1000,
        cachedInputTokens: 0,
        outputTokens: 100,
        latenciaMs: 1,
      },
    };
  }
}
