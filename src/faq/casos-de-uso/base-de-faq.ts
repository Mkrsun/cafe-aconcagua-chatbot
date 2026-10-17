import { randomUUID } from "node:crypto";
import {
  Conflicto,
  DatosInvalidos,
  NoEncontrado,
} from "../../plataforma/errores.js";
import type { IRegistros } from "../../plataforma/registros/puerto.js";
import type { AccionSobreEntrada } from "../dominio/documento.js";
import {
  MAXIMO_DE_ENTRADAS,
  validarDatos,
  versionDe,
  type EntradaDeFaq,
} from "../dominio/entrada.js";
import { exigirPreguntaUnica, exigirVigente } from "../dominio/reglas.js";
import { DocumentoEnRegistros } from "./documento-en-registros.js";

/** Las preguntas frecuentes: un documento en los registros duraderos, escrito bajo llave. */
export class BaseDeFaq {
  private readonly documento: DocumentoEnRegistros;

  constructor(
    registros: IRegistros,
    private readonly ahora: () => Date,
  ) {
    this.documento = new DocumentoEnRegistros(registros);
  }

  async listar(): Promise<readonly EntradaDeFaq[]> {
    return (await this.documento.leer()).entradas;
  }

  async historial() {
    return (await this.documento.leer()).historial;
  }

  /** Lo que llega al turno: solo lo publicado. */
  async publicadas() {
    return (await this.listar())
      .filter((e) => e.estado === "publicada")
      .map((e) => ({ pregunta: e.pregunta, respuesta: e.respuesta }));
  }

  crear(crudo: Record<string, unknown>, actor: string) {
    const datos = validarDatos(crudo);
    return this.documento.modificar(actor, (entradas) => {
      if (entradas.length >= MAXIMO_DE_ENTRADAS)
        throw new Conflicto("faq-llena");
      exigirPreguntaUnica(entradas, datos.pregunta);
      const en = this.ahora().toISOString();
      const nueva: EntradaDeFaq = {
        id: `faq-${randomUUID()}`,
        ...datos,
        estado: "borrador",
        version: 1,
        creadaEn: en,
        actualizadoPor: actor,
        actualizadoEn: en,
      };
      return {
        entradas: [...entradas, nueva],
        entrada: nueva,
        accion: "creada",
      };
    });
  }

  editar(
    id: string,
    crudo: Record<string, unknown>,
    version: unknown,
    actor: string,
  ) {
    return this.cambiarEntrada(
      id,
      version,
      actor,
      "editada",
      (actual, entradas) => {
        const datos = validarDatos({ ...actual, ...crudo });
        exigirPreguntaUnica(entradas, datos.pregunta, id);
        if (actual.estado === "publicada" && !datos.respuesta)
          throw new DatosInvalidos("una pregunta publicada necesita respuesta");
        return datos;
      },
    );
  }

  publicar(id: string, version: unknown, actor: string) {
    return this.cambiarEntrada(id, version, actor, "publicada", (actual) => {
      if (!actual.respuesta.trim())
        throw new DatosInvalidos("para publicar, escribe la respuesta");
      return { estado: "publicada" as const };
    });
  }

  despublicar(id: string, version: unknown, actor: string) {
    return this.cambiarEntrada(id, version, actor, "despublicada", () => ({
      estado: "borrador" as const,
    }));
  }

  async eliminar(id: string, version: unknown, actor: string) {
    await this.documento.modificar(actor, (entradas) => {
      const actual = exigirVigente(entradas, id, version);
      const entrada = { ...actual, actualizadoEn: this.ahora().toISOString() };
      const resto = entradas.filter((e) => e.id !== id);
      return { entradas: resto, entrada, accion: "eliminada" };
    });
  }

  private cambiarEntrada(
    id: string,
    version: unknown,
    actor: string,
    accion: AccionSobreEntrada,
    cambio: (
      actual: EntradaDeFaq,
      todas: readonly EntradaDeFaq[],
    ) => Partial<EntradaDeFaq>,
  ) {
    return this.documento.modificar(actor, (entradas) => {
      const actual = exigirVigente(entradas, id, version);
      const entrada: EntradaDeFaq = {
        ...actual,
        ...cambio(actual, entradas),
        version: versionDe(actual) + 1,
        actualizadoPor: actor,
        actualizadoEn: this.ahora().toISOString(),
      };
      return {
        entradas: entradas.map((e) => (e.id === id ? entrada : e)),
        entrada,
        accion,
      };
    });
  }
}
