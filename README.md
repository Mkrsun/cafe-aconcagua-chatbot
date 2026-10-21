# Café Aconcagua Chatbot

El chatbot de ventas de **Café Aconcagua** por WhatsApp. Espera a que el cliente termine de escribir y
responde una sola vez a toda la ráfaga. Muestra los cafés con el precio del tramo del cliente (minorista o
mayorista) y arma el resumen del pedido con los botones «Confirmar» y «Cambiar algo». Después cobra con un
botón «Pagar» de Khipu y avisa cuando llega el pago. Si el cliente pide una persona, está molesto o el chatbot
no tiene el dato, le pasa el caso a la encargada: le manda un aviso real por WhatsApp y la conversación queda
en la bandeja.

Es el producto de un solo negocio. No es una plataforma y no tiene admin web. Lo que define a Café (catálogo,
precios, despacho y preguntas frecuentes) vive en `definiciones/`. El equipo opera desde la terminal con dos
comandos:

- **`pnpm cargar`** deja la base de datos igual a `definiciones/`. Con `--clientes archivo.json`, además crea
  o actualiza los clientes de ese archivo.
- **`pnpm bandeja`** sirve para atender las conversaciones: verlas, responder, tomarlas, pausarlas,
  devolvérselas al chatbot o resolverlas.

Para Café, en simple: `docs/entrega.md` explica qué hace el producto, qué no hace, cómo se opera y qué se
configura.

## Probar en local en 5 pasos

No necesitas hosting, número de WhatsApp ni cuenta de Khipu. El servidor real corre en tu computador con
WhatsApp y Khipu **dobles**, y nada sale a internet salvo las consultas al modelo. Tú escribes como cliente
desde la terminal. La guía paso a paso, pensada para quien no es desarrollador, está en
[`SETUP.md`](SETUP.md).

```bash
# 1. Instalar (Node 24 y pnpm 10)
pnpm install
cp .env.example .env            # pon tu OPENAI_API_KEY; DATABASE_URL ya apunta a la base de docker compose

# 2. Base de datos: PostgreSQL 16 en 127.0.0.1:5433 (usuario cafe, base cafe_dev)
docker compose up -d

# 3. Datos de ejemplo: el catálogo real con algunos precios, dos zonas, tres preguntas y dos clientes
pnpm semilla

# 4. El servidor real con WhatsApp y Khipu dobles y el modelo real de OpenAI
pnpm local                      # abre el simulador en http://localhost:8093/

# 5. Prueba en el simulador: escribe como cliente y atiende como el equipo
```

El **simulador** (solo local) tiene a la izquierda el teléfono del cliente: Ana Pérez (minorista) o Emporio
Dos Hermanos (mayorista), con los botones y listas del chatbot para tocar, «Compartir ubicación» y «Simular
pago». A la derecha está el equipo: la bandeja (responder, tomar, pausar, resolver), los avisos que recibió por
WhatsApp y el gasto del modelo del mes (llamadas, tokens y dólares si hay tarifa). Vive en el servidor de los
dobles de `pnpm local`, en 127.0.0.1: el servidor del producto sigue sin pantallas.

Sin navegador, lo mismo desde la terminal: `pnpm conversar` (`--cliente mayorista`) escribe como cliente
(botones y listas con su número, `/ubicacion`, `/pagar`, `/ayuda`, `/salir`) y `pnpm bandeja` atiende como el
equipo.

Qué consume tokens, cuánto cuesta y cómo conectar otro proveedor del modelo: `SETUP.md`, punto 9.

La semilla y el modo local solo aceptan una base de tu computador cuyo nombre empiece por `cafe_dev` (o
`cafe_test` en las pruebas), y nunca corren con `CAFE_ENV=produccion`. Las esperas son las del producto: unos
25 s tras un mensaje normal. Para probar más rápido, baja `CAFE_VENTANA_AGRUPACION_MS` en `.env`. Los puertos
se cambian con `CAFE_PUERTO` (servidor, 8092) y `CAFE_DOBLES_PUERTO` (dobles, 8093).

**Sin Docker**: en un PostgreSQL 16 ya instalado, crea el usuario y la base y deja la misma `DATABASE_URL`
(cambia el puerto si el tuyo es otro):

```bash
psql -U postgres -c "CREATE USER cafe WITH PASSWORD 'cafe'" -c "CREATE DATABASE cafe_dev OWNER cafe"
# DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5432/cafe_dev
```

## Las definiciones de Café

| Archivo | Qué define |
|---|---|
| `definiciones/catalogo.ts` | Cada formato (SKU) con su café, gramaje, disponibilidad y precio minorista y mayorista. `null` = precio pendiente |
| `definiciones/despacho.ts` | Las zonas de despacho: comunas, costo, desde qué total es gratis y plazo en días hábiles |
| `definiciones/preguntas-frecuentes.ts` | Lo que el chatbot puede contestar sobre el negocio (horarios, retiro, pagos…), sin montos |

Para cambiar algo, edita el archivo, revisa el cambio con `pnpm verify` y corre `pnpm cargar` contra la base.
La carga valida todo antes de escribir y muestra cada cambio. Lo que se quita de las definiciones queda
archivado (formatos) o se elimina (zonas y preguntas). Al final avisa cuántos precios siguen pendientes:
cuando un cliente pregunta por uno de esos, la consulta pasa a una persona.

**Clientes.** Son datos personales, así que no van al repositorio. Se cargan desde un archivo JSON fuera de
git, con `pnpm cargar --clientes /ruta/clientes.json`:

```json
[
  {
    "nombre": "Emporio Dos Hermanos",
    "tipo": "mayorista-tienda",
    "tramo": "mayorista",
    "telefonos": ["56933334444"],
    "consentimiento": "otorgado",
    "fuente": "lo pidió en la tienda el 2026-10-01"
  }
]
```

Cada cliente se reconoce por su teléfono. Si ya existe, se actualiza; si no, se crea. Los clientes que no
vienen en el archivo quedan como están. El `tipo` es `mayorista-tienda`, `mayorista-local`, `minorista` u
`horeca`, y el `consentimiento` es `desconocido`, `otorgado` o `retirado`.

## La bandeja desde la terminal

```bash
pnpm bandeja                                   # las que esperan a una persona (pausadas y asignadas)
pnpm bandeja todas                             # todas
pnpm bandeja ver 56933334444                   # el hilo, por teléfono del cliente o id de conversación
pnpm bandeja responder 56933334444 --como Glei Hola, te llamo en cinco minutos
pnpm bandeja tomar 56933334444 --como Glei     # te la asignas sin escribir
pnpm bandeja pausar 56933334444 [motivo]       # el chatbot deja de responder ahí
pnpm bandeja reanudar 56933334444              # quita la pausa (si nadie la tomó, sigue el chatbot)
pnpm bandeja resolver 56933334444              # la cierra: el próximo mensaje lo atiende el chatbot
```

Una conversación que alguien del equipo tomó o respondió queda a su cargo hasta que la **resuelve**; reanudarla
solo quita la pausa. `pnpm bandeja` usa la misma configuración del servidor: la base y el WhatsApp reales. Responder solo funciona
dentro de las 24 horas desde el último mensaje del cliente, porque fuera de ese plazo WhatsApp solo admite
plantillas aprobadas.

## Levantarlo

**En un servidor (producción)**: la guía paso a paso, para quien nunca administró uno, está en
[`docs/manual-produccion.md`](docs/manual-produccion.md): un VPS de Contabo con Docker, HTTPS automático y el
comando `./deploy/cafe` (arrancar, cargar, clientes, bandeja, logs, respaldo, actualizar). La configuración
real va en `deploy/produccion.env`, a partir de `deploy/produccion.env.example`.

**Sin Docker**, en cualquier máquina. Requisitos: Node 24, pnpm 10 y, para producción, PostgreSQL 16.

```bash
pnpm install
cp .env.example .env          # completa las variables (sin secretos en git)
pnpm cargar                   # migra la base y carga las definiciones de Café
pnpm start                    # el servidor: /salud, /webhooks/whatsapp y /payments/khipu/webhook
```

Con `DATABASE_URL`, las migraciones (`migrations/`, todo en el esquema `cafe`) se aplican al arrancar y al
cargar. Sin `DATABASE_URL`, todo queda en memoria: sirve solo para desarrollo, y con `CAFE_ENV=produccion` el
arranque lo rechaza. El servidor no tiene más rutas: no hay admin ni API de operación.

## Variables de entorno

| Variable | Para qué | Por defecto |
|---|---|---|
| `CAFE_ENV` | `desarrollo` o `produccion` (en producción exige base, tarifa y firma de WhatsApp) | `desarrollo` |
| `CAFE_PUERTO` | Puerto HTTP | `8092` |
| `DATABASE_URL` | PostgreSQL | en memoria |
| `OPENAI_API_KEY` | Clave del proveedor del modelo (cualquier API compatible con OpenAI) | obligatoria |
| `CAFE_MODELO_BASE_URL` | Base de la API compatible con OpenAI | `https://api.openai.com/v1` |
| `CAFE_MODELO` | Modelo del turno | `gpt-6-luna` |
| `CAFE_MODELO_ESFUERZO` | Esfuerzo de razonamiento, si el modelo lo admite | — |
| `CAFE_MODELO_TIMEOUT_MS` | Tope de cada inferencia | `25000` |
| `CAFE_MODELO_TARIFA_USD_POR_MTOK` | Tarifa `entrada,cacheada,salida` en USD por millón de tokens | obligatoria en producción |
| `CAFE_LIMITE_GASTO_USD_MES` | Límite mensual del modelo (mes de Chile) | `50` |
| `META_ACCESS_TOKEN` | Token de WhatsApp Cloud API | — |
| `WHATSAPP_PHONE_NUMBER_ID` | El número de Café en Cloud API | — |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook (sin él, el webhook responde 404) | — |
| `WHATSAPP_APP_SECRET` | Secreto de la app para la firma `X-Hub-Signature-256` (obligatorio en producción) | — |
| `META_GRAPH_API_VERSION` | Versión de Graph | `v25.0` |
| `META_GRAPH_BASE_URL` | Base de Graph (solo pruebas) | `https://graph.facebook.com` |
| `WHATSAPP_PAYMENT_TEMPLATE` | Plantilla aprobada «pago recibido» (`{{1}}` nombre, `{{2}}` monto pagado) | — |
| `WHATSAPP_HANDOFF_TEMPLATE` | Plantilla aprobada «aviso al equipo» (`{{1}}` cliente, `{{2}}` motivo, `{{3}}` resumen) | — |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Idioma de las plantillas en Meta | `es` |
| `CAFE_EQUIPO_WHATSAPP` | Números del equipo que reciben los avisos, separados por coma | — |
| `CAFE_ROL_ENCARGADO` | Cómo el chatbot nombra a quien recibe un traspaso | `la encargada` |
| `CAFE_ESPERA_INCOMPLETA_MS` | Espera tras un mensaje que quedó a medias | `45000` |
| `CAFE_VENTANA_AGRUPACION_MS` | Espera tras un mensaje normal | `25000` |
| `CAFE_ESPERA_CIERRE_MS` | Espera tras una pregunta, un «sí» o una despedida | `8000` |
| `CAFE_TECHO_AGRUPACION_MS` | Techo desde el primer mensaje del lote | `180000` |
| `CAFE_DESPACHO_CADA_MS` | Cada cuánto el despachador busca lotes vencidos | `1000` |
| `KHIPU_API_KEY` | Cobro por Khipu (sin ella, el pedido confirmado pasa a la encargada) | — |
| `KHIPU_BASE_URL` | Base de la API de Khipu (solo pruebas) | `https://payment-api.khipu.com/v3` |
| `KHIPU_NOTIFY_URL` | URL pública de `/payments/khipu/webhook` que se le pasa a Khipu | — |
| `CAFE_DOBLES_PUERTO` | Solo local: puerto de los dobles de WhatsApp y Khipu y del simulador | `8093` |

## Comandos

```bash
pnpm verify        # la puerta: tipos, formato, líneas ≤ 100, arquitectura y pruebas
pnpm test          # pruebas; las de Postgres corren con DATABASE_URL=…/cafe_test (solo cafe_test*)
pnpm format        # prettier
pnpm cargar        # definiciones/ → base de datos (y --clientes archivo.json)
pnpm bandeja       # atender conversaciones (pnpm bandeja ayuda)
pnpm semilla       # datos de ejemplo en la base de desarrollo
pnpm local         # servidor real con WhatsApp y Khipu dobles, y el simulador web
pnpm conversar     # conversar como cliente con el modo local
```

### Pruebas de punta a punta (Playwright, sin navegador)

Cada prueba levanta el servidor real con su propia base `cafe_test_e2e_*` (la crea y la borra) y con dobles
de WhatsApp, del modelo y de Khipu. El cliente escribe por el webhook y el equipo usa `pnpm bandeja`.

```bash
pnpm e2e:smoke     # el servidor arranca y solo expone la salud y los webhooks
pnpm e2e:critical  # pedido completo, traspaso con respuesta del equipo y cambio de precio
pnpm e2e:simulador # el simulador de pnpm local en Chromium (pedido, pago, gasto y bandeja)
pnpm e2e           # las tres
```

La suite del simulador usa Chromium: el preinstalado en `/opt/pw-browsers` si existe, o el de
`pnpm exec playwright install chromium` (una vez). La base de los e2e sale de `CAFE_E2E_DATABASE_URL` (por defecto `postgresql://cafe@127.0.0.1:55432/cafe_test`)
y solo acepta bases `cafe_test*`. `E2E_WORKERS` fija cuántas pruebas corren a la vez (2 por defecto). El
reporte queda en `e2e/.resultados/html`.

## Cómo se trabaja

Cambios pequeños con sus pruebas, y `pnpm verify` en verde antes de integrar. El detalle está en `CLAUDE.md`.
