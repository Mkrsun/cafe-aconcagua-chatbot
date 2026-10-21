import { formatoEditable } from "../../catalogo/dominio/formato.js";
import { fotoDe } from "../../catalogo/dominio/precio.js";

/** Formatos de Café: Futaleufú en los dos tramos, Cerro Alegre solo minorista y uno pausado. */
export const formatosDePrueba = [
  formatoEditable(
    {
      sku: "0025",
      nombre: "Futaleufú — 150 gramos / Grano entero",
      familia: "futaleufu",
      familiaNombre: "Futaleufú",
      gramaje: "150g",
      disponible: true,
    },
    { minorista: 9990, mayorista: 7990 },
  ),
  formatoEditable(
    {
      sku: "0028",
      nombre: "Futaleufú — 150 gramos / Molido",
      familia: "futaleufu",
      familiaNombre: "Futaleufú",
      gramaje: "150g",
      disponible: true,
    },
    { minorista: 9990, mayorista: 7990 },
  ),
  formatoEditable(
    {
      sku: "0040",
      nombre: "Cerro Alegre — 250 gramos / Grano entero",
      familia: "cerro-alegre",
      familiaNombre: "Cerro Alegre",
      gramaje: "250g",
      disponible: true,
    },
    { minorista: 12990 },
  ),
  formatoEditable(
    {
      sku: "0088",
      nombre: "Siete Tazas — 150 gramos / Grano entero",
      familia: "siete-tazas",
      familiaNombre: "Siete Tazas",
      gramaje: "150g",
      disponible: false,
    },
    { minorista: 8990 },
  ),
];

export const fotoDePrueba = () => fotoDe(formatosDePrueba);
