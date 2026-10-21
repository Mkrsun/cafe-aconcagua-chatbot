import type { PerfilDefinido } from "../src/carga/index.js";

/**
 * Las notas de cata de cada café: lo que el chatbot cuenta cuando recomienda (sabor, acidez,
 * cuerpo, tueste, método ideal). Hasta 300 caracteres y sin montos. Mientras estén vacías, el
 * chatbot recomienda por formato y pregunta gustos, sin inventar sabores. Después de escribirlas,
 * corre `pnpm cargar` (y `pnpm banco --casos recomendacion,regalo` para ver cómo recomienda).
 * Ejemplo del formato (no es un perfil real):
 *
 *   { familia: "futaleufu", notas: "Chocolate amargo y nuez; acidez baja, cuerpo medio. Tueste " +
 *     "medio. Rinde muy bien en prensa francesa y moka." },
 */
export const PERFILES_DE_CAFE: readonly PerfilDefinido[] = [
  // Alto de Oso
  { familia: "alto-de-oso", notas: "" },
  // Bourbon Aruzi
  { familia: "bourbon-aruzi", notas: "" },
  // Torres del Paine
  { familia: "torres-del-paine", notas: "" },
  // Volcan Osorno
  { familia: "volcan-osorno", notas: "" },
  // Entre Lagos
  { familia: "entre-lagos", notas: "" },
  // Futaleufú
  { familia: "futaleufu", notas: "" },
  // El Prohibido
  { familia: "el-prohibido", notas: "" },
  // Capitán Mark
  { familia: "capitan-mark", notas: "" },
  // Siete Tazas
  { familia: "siete-tazas", notas: "" },
  // Caturra Nitro
  { familia: "caturra-nitro", notas: "" },
  // Playa La Virgen
  { familia: "playa-la-virgen", notas: "" },
  // Punta de Lobos
  { familia: "punta-de-lobos", notas: "" },
  // Valle de la Luna Descafeinado
  { familia: "valle-de-la-luna-descafeinado", notas: "" },
  // Volcanes
  { familia: "volcanes", notas: "" },
  // Bahía Inglesa
  { familia: "bahia-inglesa", notas: "" },
  // Gran Aconcagua
  { familia: "gran-aconcagua", notas: "" },
  // Pack degustación Linea Prime
  { familia: "pack-degustacion-linea-prime", notas: "" },
  // Pack degustación Línea tradicional
  { familia: "pack-degustacion-linea-tradicional", notas: "" },
  // Café de grano "Desierto Florido"
  { familia: "cafe-de-grano-desierto-florido", notas: "" },
  // Café de grano "Cerro alegre"
  { familia: "cafe-de-grano-cerro-alegre", notas: "" },
];
