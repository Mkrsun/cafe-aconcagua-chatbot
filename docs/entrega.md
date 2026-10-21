# Entrega: Café Aconcagua Chatbot

Esta página es para el equipo de Café. Explica en simple qué hace el producto, qué no hace, cómo se usa día a
día y qué hay que configurar. El detalle técnico está en `README.md`.

## Qué hace

El chatbot atiende a los clientes de Café por WhatsApp, con el número de Café:

- **Espera a que el cliente termine de escribir.** Si alguien manda tres mensajes seguidos, responde una sola
  vez a todo.
- **Muestra los cafés con su precio.** El precio sale siempre del catálogo de Café (`definiciones/catalogo.ts`),
  según el tramo del cliente: minorista o mayorista. El chatbot nunca inventa un precio. Si un precio no está
  cargado, le pasa la consulta a la encargada.
- **Arma el pedido**: un resumen con el total y el despacho de su comuna, y los botones «Confirmar» y «Cambiar
  algo».
- **Cobra con Khipu**: al confirmar, el cliente recibe el botón «Pagar». Cuando Khipu confirma el pago, al
  cliente le llega el aviso de pago recibido.
- **Le pasa el caso a una persona** cuando el cliente lo pide, cuando está molesto o cuando el chatbot no tiene
  el dato. Primero avisa al equipo por WhatsApp, con el motivo y un resumen. La conversación queda **pausada**
  en la bandeja hasta que alguien la retome, y mientras está pausada el chatbot no responde.
- **Responde preguntas frecuentes** (horarios, retiro, medios de pago…), pero solo con lo que está en
  `definiciones/preguntas-frecuentes.ts`.
- **Recomienda como alguien que sabe de café**: aconseja sobre métodos, molienda o cafeteras, y recomienda
  cafés según sus notas de cata (`definiciones/perfiles.ts`). Nunca inventa sabores: si un café no tiene
  notas, recomienda por formato y pregunta gustos.
- **Recuerda al cliente**: cuando vuelve otro día, sabe qué pidió las últimas veces (sin montos) y lo que le
  contó (cómo prepara su café, su local). Ante «lo mismo de la otra vez», arma ese pedido. El equipo ve y
  borra lo que recuerda con `pnpm bandeja recuerdo` y `pnpm bandeja olvidar`.
- **Cuida el gasto del modelo**: avisa al equipo cuando se usa el 50, el 80 y el 100 % del límite mensual. Al
  llegar al 100 % deja de usar el modelo y pasa los mensajes a la encargada hasta el mes siguiente.

## Qué no hace

- No escribe primero a un cliente: no hay campañas, recordatorios ni avisos de recompra.
- No atiende números que no estén cargados como clientes. A esos les responde un saludo cordial y avisa al
  equipo para que agregue la ficha.
- No escucha audios ni lee fotos. Las fotos de un reclamo quedan en la bandeja para el equipo.
- No tiene chat en la página web, ni agenda, ni cuentas por cobrar o crédito.
- No aplica descuentos automáticos: el tramo del cliente decide su precio y nada más.
- No tiene pantallas web ni admin. Todo lo que el equipo hace pasa por dos comandos de terminal.
- Pasadas 24 horas desde el último mensaje del cliente, WhatsApp solo permite plantillas aprobadas. En ese
  caso `pnpm bandeja responder` no envía y lo explica: hay que esperar a que el cliente escriba o llamarlo.

## Lo que define a Café

Todo lo propio del negocio está en la carpeta `definiciones/`. Cada cambio se hace en el archivo y después se
aplica con `pnpm cargar`:

| Archivo | Qué se define ahí |
|---|---|
| `catalogo.ts` | Los formatos que se venden (SKU, café, gramaje, si está disponible) y su precio minorista y mayorista en pesos. Un precio en `null` queda pendiente |
| `despacho.ts` | Las zonas de despacho: qué comunas cubre cada una, cuánto cuesta, desde qué total es gratis y en cuántos días hábiles llega |
| `preguntas-frecuentes.ts` | Las preguntas que el chatbot puede contestar, con su respuesta y su tema. Sin precios ni montos |
| `perfiles.ts` | Las notas de cata de cada café (sabor, acidez, cuerpo, método ideal), hasta 300 caracteres y sin precios |

`definiciones/catalogo.ts` ya trae los 39 formatos del catálogo de Café, con los precios pendientes.
`perfiles.ts` trae los 20 cafés con las notas vacías. Las zonas de despacho y las preguntas frecuentes vienen
vacías. **Antes de publicar, Café tiene que completar los precios, las zonas, las preguntas y las notas de
cata.** Mientras falten, el chatbot le pasa esas consultas a la encargada en vez
de inventar.

`pnpm cargar` deja la base exactamente igual a las definiciones:

- crea lo nuevo y actualiza lo que cambió;
- archiva los formatos que se quitaron, y el cliente deja de verlos;
- elimina las zonas y las preguntas que se quitaron;
- muestra cada cambio y, al final, cuántos precios siguen pendientes.

La carga revisa todo antes de escribir. Si algo está mal (un monto negativo, una pregunta con un precio
escrito), no cambia nada y dice qué corregir.

**Clientes.** Son datos personales, así que no van en el repositorio. Se mantienen en un archivo JSON fuera
de él (el formato está en `README.md`) y se cargan con `pnpm cargar --clientes /ruta/clientes.json`. Cada
cliente se reconoce por su teléfono: si ya existe se actualiza (nombre, tipo, tramo, consentimiento) y si no,
se crea. El tramo decide qué precio le cotiza el chatbot.

## Cómo se opera día a día

**La bandeja** (lo primero cada mañana). Cuando el chatbot pasa un caso, al equipo le llega el aviso por
WhatsApp. En la terminal del servidor:

```bash
pnpm bandeja                                         # las que esperan a una persona
pnpm bandeja ver 56933334444                         # el hilo completo, con el motivo y el resumen
pnpm bandeja responder 56933334444 --como Glei Hola, te llamo en cinco minutos
pnpm bandeja resolver 56933334444                    # la cierra: el chatbot vuelve a atender
pnpm bandeja recuerdo 56933334444                    # lo que el chatbot recuerda de ese cliente
pnpm bandeja olvidar 56933334444 2                   # borra la nota 2 (sin número, todas)
```

Una conversación se busca por el teléfono del cliente o por su id. Tu respuesta le llega al cliente por el
mismo WhatsApp y la conversación queda a tu cargo, así que el chatbot no se mete. Cuando termines,
**resolver** la cierra y el próximo mensaje del cliente lo atiende el chatbot. **Reanudar** solo quita la
pausa de una conversación que nadie tomó. Con **pausar** detienes al chatbot en una conversación que quieras
llevar tú, y con **tomar** te la asignas sin escribir. `pnpm bandeja ayuda` muestra
todos los comandos.

**Cambiar un precio, una zona o una pregunta**: edita el archivo de `definiciones/`, revisa el cambio con
`pnpm verify` y corre `pnpm cargar`.

**Cliente nuevo**: agrégalo a tu archivo de clientes y corre `pnpm cargar --clientes /ruta/clientes.json`.

## Probarlo en tu computador

No hace falta un servidor ni un número de WhatsApp para verlo funcionar. En tu computador corre el producto
real. WhatsApp y Khipu se reemplazan por **dobles**, que son simuladores locales: no sale ningún mensaje ni se
cobra nada. El modelo sí es el real de OpenAI, con tu clave. La guía paso a paso está en `SETUP.md`; en
resumen:

1. **Instalar**: `pnpm install` y copiar `.env.example` a `.env` con tu `OPENAI_API_KEY`.
2. **Base de datos**: `docker compose up -d` (o un PostgreSQL 16 instalado, ver `README.md`).
3. **Datos de ejemplo**: `pnpm semilla` carga el catálogo de Café con precios de ejemplo en seis formatos, dos
   zonas de despacho, una clienta minorista (Ana Pérez), un cliente mayorista (Emporio Dos Hermanos) y tres
   preguntas frecuentes.
4. **Arrancar**: `pnpm local`. Se abre el **simulador** en el navegador (http://localhost:8093/).
5. **Probar**: a la izquierda escribes como el cliente (Ana o Emporio) y tocas los botones del chatbot; a la
   derecha atiendes como el equipo (bandeja, avisos) y ves el gasto del modelo. También se puede desde la
   terminal con `pnpm conversar` y `pnpm bandeja`.

**Publicar en producción**: la guía paso a paso (VPS de Contabo, dominio, WhatsApp, Khipu, respaldos) está en
`docs/manual-produccion.md`. Queda a cargo de Café: el hosting (un servidor con PostgreSQL 16 y una dirección
pública con HTTPS), el número real de WhatsApp en la app de Meta con sus plantillas aprobadas, y la cuenta real
de Khipu. Lo que hay que configurar está en la sección siguiente.

## Qué se configura

Todo se configura con variables de entorno en el servidor. La lista completa está en `README.md` y en
`.env.example`. Lo esencial:

- **Base de datos** (`DATABASE_URL`): PostgreSQL 16. Al arrancar se preparan las tablas. Después hay que
  correr `pnpm cargar` para cargar el catálogo, el despacho y las preguntas.
- **Modelo** (`OPENAI_API_KEY`, `CAFE_MODELO`, `CAFE_MODELO_TARIFA_USD_POR_MTOK`, `CAFE_LIMITE_GASTO_USD_MES`):
  la clave del proveedor, el modelo, su tarifa (sin tarifa el límite de gasto no puede cortar) y el límite
  mensual en dólares.
- **WhatsApp** (`META_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
  `WHATSAPP_APP_SECRET`): los datos de la app de Meta. En Meta, el webhook apunta a
  `https://<tu-dominio>/webhooks/whatsapp` con el mismo token de verificación.
- **Plantillas que Meta debe aprobar** (en español, categoría «utilidad»):
  - **Pago recibido** (`WHATSAPP_PAYMENT_TEMPLATE`): `{{1}}` nombre del cliente y `{{2}}` monto pagado.
  - **Aviso al equipo** (`WHATSAPP_HANDOFF_TEMPLATE`): `{{1}}` cliente, `{{2}}` motivo y `{{3}}` resumen.
  Sin la plantilla de aviso, el equipo recibe el aviso solo si le escribió al número de Café en las últimas
  24 horas.
- **Equipo** (`CAFE_EQUIPO_WHATSAPP`): los números que reciben los avisos, separados por coma.
- **Khipu** (`KHIPU_API_KEY`, `KHIPU_NOTIFY_URL`): sin Khipu, un pedido confirmado pasa a la encargada para
  que lo cobre. La URL de aviso es `https://<tu-dominio>/payments/khipu/webhook`.

## Cómo seguir desarrollándolo con Claude Code

La guía completa para tomar el proyecto desde cero (con otra cuenta de Claude Code) está en
`docs/traspaso.md`: el estado, los PRs por integrar, lo que falta para publicar y las decisiones tomadas.

El repo está preparado para trabajar con Claude Code (o con cualquier agente), y `CLAUDE.md` tiene las
reglas. El camino para cualquier cambio:

1. **Pide el cambio en simple** («quiero que el despacho a regiones cueste distinto»).
2. Pídele a Claude que agregue o ajuste las **pruebas** del cambio junto con el código.
3. Antes de dar algo por bueno: `pnpm verify` en verde y, si el cambio toca una conversación, `pnpm e2e`.
4. Prueba el cambio en local con `pnpm local` y el simulador (ver `SETUP.md`).
5. Si el cambio toca cómo habla el chatbot, mídelo con `pnpm banco` antes y después.

Las líneas rojas no se negocian, ni siquiera a pedido: el precio sale del catálogo y nunca del modelo; el
consentimiento del cliente manda; fuera de la ventana de 24 horas solo salen plantillas; el aviso al equipo no
se salta; y nunca se usan claves reales ni la base de producción en pruebas.
