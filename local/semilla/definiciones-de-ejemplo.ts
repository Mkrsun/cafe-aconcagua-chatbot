import type {
  ClienteDefinido,
  DefinicionesDeCafe,
} from "../../src/carga/index.js";
import { DEFINICIONES_DE_CAFE } from "../../definiciones/index.js";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import { PRECIOS, PREGUNTAS, ZONAS } from "./datos.js";

/** El catálogo real de Café con precios de ejemplo en algunos formatos, zonas y FAQ de ejemplo. */
export const DEFINICIONES_DE_EJEMPLO: DefinicionesDeCafe = {
  catalogo: DEFINICIONES_DE_CAFE.catalogo.map((f) => {
    const ejemplo = PRECIOS.find((p) => p.sku === f.sku);
    return ejemplo
      ? {
          ...f,
          precios: {
            minorista: ejemplo.minorista,
            mayorista: ejemplo.mayorista,
          },
        }
      : f;
  }),
  despacho: ZONAS,
  preguntas: PREGUNTAS,
  perfiles: DEFINICIONES_DE_CAFE.perfiles,
};

/** Los clientes de `pnpm conversar`, con consentimiento. */
export const CLIENTES_DE_LA_SEMILLA: readonly ClienteDefinido[] = Object.values(
  CLIENTES_DE_EJEMPLO,
).map((c) => ({
  nombre: c.nombre,
  tipo: c.tipo,
  tramo: c.tramo,
  telefonos: [c.telefono],
  consentimiento: "otorgado",
  fuente: "semilla de desarrollo",
}));
