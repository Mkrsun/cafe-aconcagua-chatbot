import type {
  ClienteDefinido,
  DefinicionesDeCafe,
} from "../dominio/definiciones.js";

/** Un negocio chico para las pruebas: el Futaleufú con precios, una zona y una pregunta. */
export const NEGOCIO_DE_PRUEBA: DefinicionesDeCafe = {
  catalogo: [
    {
      sku: "0028",
      nombre: "Futaleufú — 150 gramos / Molido",
      familia: "futaleufu",
      familiaNombre: "Futaleufú",
      gramaje: "150g",
      precios: { minorista: 9990, mayorista: 8490 },
    },
    {
      sku: "0025",
      nombre: "Futaleufú — 150 gramos / Grano entero",
      familia: "futaleufu",
      familiaNombre: "Futaleufú",
      gramaje: "150g",
      precios: { minorista: 9990, mayorista: 8490 },
    },
  ],
  despacho: [
    {
      zona: "Santiago oriente",
      comunas: ["Ñuñoa", "Providencia"],
      montoClp: 3990,
      gratisDesdeClp: 40000,
      plazo: { desdeDias: 1, hastaDias: 2 },
    },
  ],
  preguntas: [
    {
      pregunta: "¿Cuál es el horario de atención?",
      respuesta: "De lunes a viernes, de 10:00 a 18:00.",
      tema: "horarios",
    },
  ],
};

const cliente = (
  nombre: string,
  telefono: string,
  mayorista = false,
): ClienteDefinido => ({
  nombre,
  tipo: mayorista ? "mayorista-tienda" : "minorista",
  tramo: mayorista ? "mayorista" : "minorista",
  telefonos: [telefono],
  consentimiento: "otorgado",
  fuente: "prueba",
});

export const ANA = cliente("Ana Pérez", "56911112222");
export const EMPORIO = cliente("Emporio Dos", "56933334444", true);
