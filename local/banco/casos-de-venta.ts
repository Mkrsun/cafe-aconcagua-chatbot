import type { Escenario } from "./escenario.js";
import { minorista } from "./clientes.js";

/** Vender: catálogo, recomendación, precios, pedidos y mayoristas. */
export const CASOS_DE_VENTA: readonly Escenario[] = [
  {
    id: "saludo",
    descripcion: "Saluda y pregunta qué hay",
    cliente: minorista("Camila Rojas"),
    pasos: [
      {
        cliente: ["holaa buenas tardes 😊", "qué cafés tienen?"],
        espera: "respuesta",
      },
    ],
  },
  {
    id: "recomendacion",
    descripcion: "No sabe de café y pide consejo",
    cliente: minorista("Diego Muñoz"),
    pasos: [
      {
        cliente:
          "Hola! la verdad no sé mucho de café jaja. Me gusta suavecito, no muy " +
          "amargo, y lo preparo en prensa francesa. Qué me recomiendas?",
        espera: "respuesta",
      },
      { cliente: "y ese viene molido para prensa?", espera: "respuesta" },
    ],
  },
  {
    id: "pedido-completo",
    descripcion: "Pide, da la comuna después y confirma",
    cliente: minorista("Ana Pérez"),
    pasos: [
      {
        cliente: ["hola", "quiero 2 bolsas de futaleufú molido"],
        espera: "resumen",
      },
      {
        cliente: "es para Ñuñoa",
        espera: "resumen",
        menciona: [/Despacho a Santiago oriente/],
      },
      { cliente: "sí, confirmo", espera: "pago" },
    ],
  },
  {
    id: "cambio-de-pedido",
    descripcion: "Cambia la cantidad y agrega otro formato",
    cliente: minorista("Francisca Soto"),
    pasos: [
      {
        cliente: "Hola, me das 1 futaleufú en grano para Providencia?",
        espera: "resumen",
      },
      {
        cliente: "uy mejor que sean 3, y agrégame uno molido también",
        espera: "resumen",
        menciona: [/3 × Futaleufú/],
      },
    ],
  },
  {
    id: "cancela-resumen",
    descripcion: "Ve el resumen y prefiere cambiarlo",
    cliente: minorista("Pedro Lagos"),
    pasos: [
      { cliente: "quiero 2 futaleufú en grano", espera: "resumen" },
      { cliente: "no, espera", espera: "respuesta" },
    ],
  },
  {
    id: "precio",
    descripcion: "Pregunta un precio",
    cliente: minorista("Tomás Herrera"),
    pasos: [
      {
        cliente: "cuánto sale el futaleufú en grano?",
        espera: "respuesta",
        menciona: [/\$9\.990/],
      },
    ],
  },
  {
    id: "precio-pendiente",
    descripcion: "Quiere un café sin precio cargado",
    cliente: minorista("Lucía Navarro"),
    pasos: [
      { cliente: "hola! quiero 2 bolsas de volcán osorno", espera: "traspaso" },
    ],
  },
  {
    id: "mayorista-consulta",
    descripcion: "Almacén pregunta por volumen y descuento",
    cliente: {
      nombre: "Emporio Dos Hermanos",
      tipo: "mayorista-tienda",
      tramo: "mayorista",
    },
    pasos: [
      {
        cliente:
          "Buenas, somos un almacén en Recoleta. Necesitamos unas 20 bolsas para la " +
          "tienda, ¿qué nos pueden ofrecer y hay descuento por volumen?",
        espera: "respuesta",
      },
    ],
  },
  {
    id: "mayorista-pedido",
    descripcion: "Cafetería pide con su precio de tramo",
    cliente: { nombre: "Café del Cerro", tipo: "horeca", tramo: "mayorista" },
    pasos: [
      {
        cliente: "Hola, necesito 10 futaleufú en grano para Recoleta",
        espera: "resumen",
        menciona: [/\$84\.900/],
      },
    ],
  },
  {
    id: "cliente-que-vuelve",
    descripcion:
      "Compra, el equipo cierra la conversación y vuelve por lo mismo",
    cliente: minorista("Rosa Valdés"),
    pasos: [
      {
        cliente: "hola! quiero 2 futaleufú molido, lo preparo en moka",
        espera: "resumen",
      },
      { cliente: "sí", espera: "pago" },
      {
        cliente: "hola de nuevo! me mandas lo mismo de la otra vez?",
        antes: "resolver",
        espera: "resumen",
        menciona: [/2 × Futaleufú — 150 gramos \/ Molido/],
      },
    ],
  },
];
