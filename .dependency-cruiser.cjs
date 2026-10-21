/**
 * Reglas de arquitectura del chatbot de Café Aconcagua.
 *
 * Por qué existe: que el código no se desordene. No hay violaciones conocidas ni baseline: cualquier
 * violación hace fallar `pnpm arquitectura` y `pnpm verify`. Una violación se corrige (fachada, mover
 * la pieza a su dueño, romper el ciclo, borrar el código muerto); nunca se exenta.
 */
const CAPAS_PURAS = "(^|/)(dominio|casos-de-uso)/";
const INFRAESTRUCTURA = [
  "(^|/)(adaptadores|http)/",
  "(^|/)node_modules/(pg|hono|@hono)/",
];
const PLATAFORMA = "^src/plataforma/";
const TESTS = "\\.test\\.ts$";
/** Fakes, contratos y soporte de pruebas: existen para los tests (y el modo en memoria). */
const SOPORTE_DE_TEST = [
  TESTS,
  "\\.contrato\\.ts$",
  "-en-memoria\\.ts$",
  "-falso\\.ts$",
  "(^|/)test-support/",
  "\\.d\\.ts$",
];
/** Los ejecutables: el servidor y los comandos del equipo (`pnpm cargar` y `pnpm bandeja`). */
const PUNTO_DE_ENTRADA = "^launcher/(main|cargar|bandeja)\\.ts$";

module.exports = {
  forbidden: [
    {
      name: "dominio-sin-infraestructura",
      comment: "dominio/ y casos-de-uso/ no importan adaptadores, http, pg ni hono.",
      severity: "error",
      from: { path: CAPAS_PURAS, pathNot: TESTS },
      to: { path: INFRAESTRUCTURA },
    },
    {
      name: "dominio-sin-io-de-node",
      comment: "dominio/ y casos-de-uso/ no tocan el sistema de archivos ni la red.",
      severity: "error",
      from: { path: CAPAS_PURAS, pathNot: TESTS },
      to: { dependencyTypes: ["core"], path: "^(node:)?(fs|fs/promises|net|http)$" },
    },
    {
      name: "plataforma-no-importa-features",
      comment: "La plataforma es el núcleo compartido: no conoce las features.",
      severity: "error",
      from: { path: PLATAFORMA, pathNot: TESTS },
      to: { path: "^src/", pathNot: PLATAFORMA },
    },
    {
      name: "features-por-su-fachada",
      comment:
        "Una feature importa a otra solo por su index.ts, sus puertos/ o su dominio/. El soporte de pruebas arma mundos con piezas de varias.",
      severity: "error",
      from: {
        path: "^src/([^/]+)/",
        pathNot: [PLATAFORMA, TESTS, "(^|/)test-support/"],
      },
      to: {
        path: "^src/",
        pathNot: [
          "^src/$1/",
          PLATAFORMA,
          "^src/[^/]+/index\\.ts$",
          "^src/[^/]+/(puertos|dominio)/",
        ],
      },
    },
    {
      name: "src-no-importa-launcher",
      comment: "launcher/ es la raíz de composición: conoce a src, src no lo conoce a él.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^launcher/" },
    },
    {
      name: "sin-imports-rotos",
      comment: "Todo import resuelve a un archivo o paquete existente.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "sin-ciclos",
      comment: "Un ciclo de imports impide entender (y mover) un módulo por separado.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "sin-huerfanos",
      comment: "Un archivo de producción que nadie importa es código muerto: se borra.",
      severity: "error",
      from: { orphan: true, pathNot: [...SOPORTE_DE_TEST, PUNTO_DE_ENTRADA] },
      to: {},
    },
    {
      name: "sin-codigo-muerto",
      comment:
        "Un archivo de producción que solo importan las pruebas no corre nunca: es código muerto.",
      severity: "error",
      from: { path: PUNTO_DE_ENTRADA },
      to: { path: "^src/", pathNot: SOPORTE_DE_TEST, reachable: false },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.test.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".js", ".json"],
    },
  },
};
