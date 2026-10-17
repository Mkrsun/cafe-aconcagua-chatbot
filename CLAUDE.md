# Café Aconcagua Chatbot — guía para agentes

Este repo es el **chatbot de ventas de Café Aconcagua**: atiende a los clientes por WhatsApp, cotiza con los
precios del catálogo, cobra por Khipu y le pasa el caso a una persona del equipo cuando corresponde. Es el
producto de **un solo negocio**: lo propio de Café está fijo en el código y en `definiciones/`; no hay
multi-tenant, plugins, admin web ni API de operación. El equipo opera desde la terminal (`pnpm cargar` y
`pnpm bandeja`).

Si es tu primera vez aquí, lee `README.md` y `SETUP.md` (cómo levantarlo y probarlo en local).

## Cómo se trabaja (reglas del repo)

1. **Cada cambio con su prueba.** Antes de tocar el código, escribe (o ajusta) la prueba que describe lo que
   se quiere y mírala fallar; después, el código mínimo que la pone verde. Las pruebas son la documentación
   del comportamiento: si no está probado, no está garantizado.
2. **TDD.** Test rojo, código mínimo, verde, refactor. Nunca borres un `expect`, bajes un umbral, uses `skip`/
   `only` ni agregues reintentos para tapar una prueba; si falla por un bug real, arréglalo o repórtalo.
3. **Hexagonal solo donde hay un borde real.** Los bordes son WhatsApp, el modelo (LLM), Khipu, PostgreSQL y
   el reloj: cada uno tiene su puerto en `puertos/`, un fake (`*-en-memoria.ts`, `*-falso.ts`) y un adaptador
   real, y los dos pasan la misma suite de contrato (`*.contrato.ts`). Fuera de los bordes, código directo:
   nada de capas "por si acaso". El dominio no importa infraestructura. `pnpm arquitectura` debe quedar en
   0 violaciones; **nunca se exenta una regla**: se mueve la pieza o se pasa por la fachada (`index.ts`).
4. **Commits temáticos**, varios y pequeños (`feat(scope): …`, `fix(scope): …`, `test(...)`, `docs(...)`,
   `chore(...)`), cada uno con `pnpm verify` en verde.
5. **Trabajo por rama.** Cada cambio en su rama; a `main` entra solo con `pnpm verify` en verde. Nunca hagas
   force push a `main`.
6. **Legibilidad (clean code).** Una responsabilidad por archivo y por función (SRP). Archivos cortos
   (orientativo: hasta ~150 líneas de código; si crecen, se separan por responsabilidad), funciones que caben
   en una pantalla, nombres en español que dicen qué hacen, y comentarios solo para el *por qué*. Organización
   por feature (carpeta por área del negocio), no por tipo técnico. En pruebas, sin `as unknown as`: un fake
   del puerto o una función auxiliar con una sola conversión. En TypeScript, sin líneas de más de 100
   caracteres (prettier lo verifica). Se revisa la legibilidad antes de cada commit, no al final.

## Mapa del repo

| Ruta | Qué hay |
|---|---|
| `definiciones/` | **Lo que define a Café**: catálogo (SKU y precio por tramo), zonas de despacho y preguntas frecuentes. `pnpm cargar` deja la base igual a esto |
| `src/plataforma/` | Núcleo compartido: registros duraderos, reloj, PostgreSQL y migraciones, utilidades de texto, pesos y teléfonos. **No importa de las features.** |
| `src/whatsapp/` | Borde de WhatsApp Cloud API: webhook firmado, entrantes, canal de salida, mensajes interactivos, ventana de 24 h, plantillas por nombre, espera humana y cola durable |
| `src/turno/` | El Turn Agent: una decisión del modelo por lote, marcadores de precio, resumen, confirmación chilena, reclamos y traspasos |
| `src/modelo/` | Borde del LLM (un proveedor compatible con OpenAI) y el límite de gasto mensual con avisos |
| `src/catalogo/` | Catálogo y precios por tramo en PostgreSQL, con auditoría, y despacho por zona |
| `src/carga/` | La carga de `definiciones/` (y de un archivo de clientes) a la base: crea, actualiza y archiva |
| `src/pedidos/` | Pedidos, cobro por Khipu y aviso de pago recibido |
| `src/bandeja/` | Conversaciones, traspaso con aviso al equipo y respuestas del equipo |
| `src/clientes/` | CRM básico: clientes, consentimiento y política de contacto |
| `src/faq/` | Preguntas frecuentes (borrador/publicada, sin montos) |
| `src/atencion/` | Orquestación: recibir el webhook, despachar lotes vencidos y entregar la respuesta |
| `launcher/` | Raíz de composición, configuración por entorno y los ejecutables: `main.ts` (servidor), `cargar.ts` y `bandeja.ts` (comandos del equipo) |
| `e2e/` | Playwright sin navegador: `smoke` y `critical`, con el servidor real, una base `cafe_test_e2e_*` por prueba y dobles HTTP (`e2e/dobles`) |
| `local/` | Probar en local: `semilla` (datos de ejemplo), `modo-local` (servidor real con WhatsApp y Khipu dobles) y `conversar` (CLI del cliente). Como `e2e/`, fuera de `pnpm arquitectura` |
| `migrations/` | SQL de PostgreSQL (esquema `cafe`), numeradas e idempotentes |

Una feature importa a otra solo por su `index.ts`, sus `puertos/` o su `dominio/`.

## Comandos

```bash
pnpm install                 # dependencias
pnpm verify                  # LA puerta: typecheck + format + líneas ≤ 100 + arquitectura + tests
pnpm test                    # vitest; las pruebas de Postgres se saltan sin DATABASE_URL
pnpm format                  # prettier sobre src, launcher, local, definiciones y e2e
pnpm arquitectura            # dependency-cruiser (0 violaciones)
pnpm dev                     # servidor en :8092 (lee .env): /salud y los webhooks
pnpm cargar [--clientes archivo.json]   # deja la base igual a definiciones/ (y carga clientes)
pnpm bandeja [comando]       # el equipo atiende conversaciones (pnpm bandeja ayuda)
pnpm e2e:smoke | e2e:critical | e2e   # punta a punta (sin navegador)
pnpm semilla | local | conversar       # probar en local; solo bases cafe_dev*
```

Pruebas con base de datos: `DATABASE_URL=postgresql://cafe@127.0.0.1:55432/cafe_test pnpm verify`. Las suites
de PostgreSQL vacían tablas: solo aceptan una base `cafe_test*` y fallan con cualquier otra. Si varias ramas
trabajan a la vez, cada una usa **su propia base** (`createdb … cafe_test_<tarea>`): las pruebas aplican las
migraciones de la rama y vacían las tablas que tocan.

## Líneas rojas (no se negocian)

- **El precio lo fija el catálogo, por código; nunca el modelo, ni un prompt.** El modelo escribe marcadores
  (`{{precio:SKU}}`, `{{precios:FAMILIA}}`, `{{resumen}}`, `{{despacho}}`) y el sistema pone el monto del tramo
  del cliente leído de PostgreSQL. Un monto escrito por el modelo se repara o se traspasa; nunca sale.
- **Consentimiento y política de contacto del CRM** mandan sobre cualquier envío que no sea la respuesta a un
  mensaje del cliente.
- **Ventana de 24 h de WhatsApp**: fuera de ella solo sale una plantilla aprobada (por nombre, desde el entorno).
- **Traspaso a la bandeja y aviso al equipo** no se saltan: el cliente solo lee "ya le avisé" si el aviso
  salió de verdad.
- **Límite de gasto del modelo**: al llegar al límite mensual no hay más inferencias; se avisa al equipo al 50,
  80 y 100 %.
- **Sin superficie de operación por HTTP**: el servidor expone solo `/salud` y los webhooks de WhatsApp y
  Khipu (públicos por necesidad, cada uno verificado). Una ruta nueva exige una razón clara, escrita en un
  comentario junto a la ruta.
- **Migraciones**: solo hacia adelante, numeradas, idempotentes (`IF NOT EXISTS`) y sin editar las aplicadas.
  Todo vive en el esquema `cafe`.
- **Nunca** uses ni pidas credenciales reales ni una base de datos de producción. Todo corre con dobles y un
  Postgres de pruebas propio. No pongas secretos en el repo ni en logs. Los clientes reales (datos
  personales) no van al repo: se cargan desde un archivo fuera de él.

## Voz y estilo

- Texto visible al cliente y al equipo: **español neutro, sin voseo** ("vuelve", "usa", "tienes"), cálido y
  profesional. El chatbot nunca habla de "derivar", "bot", "sistema" ni "asesor"; si le preguntan en serio,
  dice que es el asistente virtual de Café Aconcagua.
- Código: nombres en español, comentarios solo para el *por qué*, SRP.

## Antes de dar algo por terminado

`pnpm verify` en verde, con `DATABASE_URL` apuntando a tu base de pruebas; si tocaste un flujo de punta a
punta, además `pnpm e2e`. Pega el resultado en el PR: la afirmación sin evidencia no cuenta.
