import { textoDeEleccion, type EleccionDelCliente } from "./eleccion.js";

/** Un punto en el mapa, con su nombre y dirección si se conocen. */
export interface UbicacionEnElMapa {
  readonly latitud: number;
  readonly longitud: number;
  readonly nombre?: string;
  readonly direccion?: string;
}

/** Lo que el cliente mandó además de texto: la opción que tocó, su ubicación o una reacción. */
export type ContenidoEntrante =
  | {
      readonly tipo: "eleccion";
      readonly origen: "boton" | "lista";
      readonly eleccion: EleccionDelCliente;
    }
  | { readonly tipo: "ubicacion"; readonly ubicacion: UbicacionEnElMapa }
  /** `emoji` vacío: quitó su reacción. */
  | {
      readonly tipo: "reaccion";
      readonly mensajeId: string;
      readonly emoji: string;
    };

const lugarDe = (u: UbicacionEnElMapa) =>
  [u.nombre, u.direccion].filter(Boolean).join(", ");

/** El texto con que entra al turno; una reacción no entra (no pide respuesta). */
export function textoParaElTurno(e: ContenidoEntrante): string | undefined {
  switch (e.tipo) {
    case "eleccion":
      return textoDeEleccion(e.eleccion);
    case "ubicacion": {
      const { latitud, longitud } = e.ubicacion;
      const lugar = lugarDe(e.ubicacion);
      return `Ubicación compartida: ${lugar ? `${lugar} ` : ""}(${latitud}, ${longitud})`;
    }
    case "reaccion":
      return undefined;
  }
}

/** Lo que ve el equipo en la bandeja, con el origen marcado. */
export function textoParaLaBandeja(e: ContenidoEntrante): string {
  switch (e.tipo) {
    case "eleccion":
      return `[${e.origen === "lista" ? "lista" : "botón"}] ${e.eleccion.titulo}`;
    case "ubicacion": {
      const { latitud, longitud } = e.ubicacion;
      return `[ubicación] ${lugarDe(e.ubicacion) || `${latitud}, ${longitud}`}`;
    }
    case "reaccion":
      return `[reacción] ${e.emoji || "quitó su reacción"}`;
  }
}
