# Probar el chatbot de Café Aconcagua en tu computador

Esta guía es para Rodo. No necesitas ser desarrollador: vas a copiar y pegar comandos en una **terminal**
(en Mac, la app «Terminal»; en Windows, «PowerShell» o «Terminal»; en Linux, la terminal de siempre).

Al final tendrás en tu computador el producto real funcionando: el chatbot responde, cotiza con los precios del
catálogo, arma el pedido y «cobra». WhatsApp y Khipu se reemplazan por **simuladores locales**: no sale ningún
mensaje a un teléfono ni se cobra nada. Lo único que sale a internet son las consultas al modelo de OpenAI.

Cada comando se escribe en una línea y se confirma con Enter. Lo que va después de `#` es una explicación:
no hace falta copiarlo.

## 1. Requisitos (una sola vez)

**Node 24.** Es lo que hace correr el chatbot. La forma más simple de instalarlo es con `nvm`:

- Mac o Linux: instala nvm siguiendo https://github.com/nvm-sh/nvm (un solo comando que está al principio de
  esa página), cierra y vuelve a abrir la terminal, y luego:

  ```bash
  nvm install 24
  nvm use 24
  node -v          # debe decir v24.algo
  ```

- Windows: instala «nvm-windows» desde https://github.com/coreybutler/nvm-windows/releases
  (`nvm-setup.exe`), abre una terminal nueva y corre los mismos `nvm install 24` y `nvm use 24`.
- Si prefieres no usar nvm, descarga el instalador de la versión 24 desde https://nodejs.org.

**pnpm.** Es el instalador de dependencias del proyecto. Viene con Node; solo hay que activarlo:

```bash
corepack enable
pnpm -v            # debe decir 10.algo
```

**Docker Desktop.** Corre la base de datos sin instalar nada más. Descárgalo desde
https://www.docker.com/products/docker-desktop, instálalo y ábrelo: tiene que quedar abierto (el ícono de la
ballena) mientras pruebas. Si no quieres Docker, puedes usar un PostgreSQL 16 instalado: lo explica el punto 4.

**Una clave de OpenAI.** El chatbot piensa con el modelo de OpenAI, así que necesitas una clave:

1. Entra a https://platform.openai.com con tu cuenta (o crea una).
2. En **Billing**, agrega un medio de pago. OpenAI cobra **por uso**: una conversación de prueba cuesta
   centavos de dólar. Puedes poner un tope mensual en **Limits** para quedarte tranquilo. (Qué consume
   tokens, cuánto cuesta y cómo usar otro proveedor: punto 9.)
3. En **API keys** (https://platform.openai.com/api-keys), crea una clave nueva y cópiala. Empieza por
   `sk-`. Guárdala: OpenAI la muestra una sola vez.

La clave es secreta: no la mandes por chat ni la subas a ningún lado. Solo va en el archivo `.env` del paso 3,
que nunca se sube al repositorio.

## 2. Instalar

Descarga el proyecto y entra a su carpeta (usa la dirección del repositorio que te entregamos):

```bash
git clone <dirección-del-repositorio> cafe-aconcagua-chatbot
cd cafe-aconcagua-chatbot
```

Instala las dependencias (tarda un par de minutos la primera vez):

```bash
pnpm install
```

Todos los comandos que siguen se corren **dentro de esa carpeta**.

## 3. Configurar `.env`

`.env` es el archivo con la configuración de tu computador. Créalo copiando el ejemplo:

```bash
cp .env.example .env
```

(En Windows con PowerShell funciona igual; si no, `copy .env.example .env`.)

Ábrelo con cualquier editor de texto. Para probar en local solo importan estas líneas:

| Variable | Qué poner |
|---|---|
| `OPENAI_API_KEY` | **Obligatoria.** Pega tu clave después del `=`, sin espacios: `OPENAI_API_KEY=sk-...` |
| `DATABASE_URL` | Ya viene lista para la base de Docker: `postgresql://cafe:cafe@127.0.0.1:5433/cafe_dev`. No la cambies salvo que uses PostgreSQL sin Docker. |
| `CAFE_MODELO` | El modelo de OpenAI. Déjalo como viene. |
| `CAFE_VENTANA_AGRUPACION_MS` | Opcional. Cuánto espera el chatbot a que termines de escribir (25000 = 25 segundos, como con un cliente real). Para probar más rápido, quítale el `#` y ponle `5000`. |
| `CAFE_PUERTO` y `CAFE_DOBLES_PUERTO` | Opcionales. Solo si el punto 7 te dice que un puerto está ocupado. |

Todo lo demás (WhatsApp, plantillas, Khipu, tarifa del modelo) es para producción: en local no se usa,
porque WhatsApp y Khipu van siempre a los simuladores.

Guarda el archivo.

## 4. Base de datos

Con Docker Desktop abierto, levanta la base (PostgreSQL 16):

```bash
docker compose up -d
```

Comprueba que está arriba:

```bash
docker compose ps
```

En la columna `STATUS` debe decir `Up … (healthy)`. Si dice `starting`, espera unos segundos y vuelve a
mirar. La base queda guardada en Docker: si apagas el computador, al día siguiente basta con volver a correr
`docker compose up -d`.

**Sin Docker**: si tienes PostgreSQL 16 instalado, crea el usuario y la base una vez:

```bash
psql -U postgres -c "CREATE USER cafe WITH PASSWORD 'cafe'" -c "CREATE DATABASE cafe_dev OWNER cafe"
```

y en `.env` cambia el puerto de `DATABASE_URL` por el de tu PostgreSQL (normalmente `5432`):
`DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5432/cafe_dev`.

Ahora carga los **datos de ejemplo**:

```bash
pnpm semilla
```

Prepara las tablas y carga: el catálogo de Café (`definiciones/catalogo.ts`) con precios minorista y
mayorista de ejemplo en seis cafés (Futaleufú, Punta de Lobos y El
Prohibido, molido y en grano), dos zonas de despacho (Santiago oriente y Santiago centro), una clienta
minorista (**Ana Pérez**), un cliente mayorista (**Emporio Dos Hermanos**), los dos con consentimiento, y tres
preguntas frecuentes publicadas (horario, retiro y medios de pago). Termina con algo como:

```
  + formato 0028 creado
  + precio minorista de 0028: $9.990
  …
  + pregunta «¿Qué medios de pago aceptan?» creada
Semilla lista: … cambios, 0 cosas ya estaban.
```

Puedes correrla las veces que quieras: no duplica nada (la segunda vez dice `0 cambios`). Deja la base igual
a los datos de ejemplo, así que si cambiaste algo a mano, vuelve a como estaba.

## 5. Arrancar

```bash
pnpm local
```

Muestra:

```
Café Aconcagua está corriendo en modo local.
  Simulador:        http://localhost:8093/ (se abre en el navegador)
  Modelo:           gpt-6-luna (real, con tu OPENAI_API_KEY)
  WhatsApp y Khipu: dobles en http://127.0.0.1:8093 (no sale ningún mensaje ni cobro real)

En el simulador escribes como cliente y atiendes como el equipo, con el gasto a la vista.
Si prefieres la terminal: pnpm conversar (cliente) y pnpm bandeja (equipo).
Ctrl+C cierra todo.
```

y abre solo el **simulador** en tu navegador (si no se abre, copia la dirección `http://localhost:8093/`). Deja
la terminal abierta: mientras siga abierta, el chatbot está funcionando. Para apagarlo, vuelve a ella y
presiona `Ctrl+C`.

**El simulador** tiene dos partes:

- **A la izquierda, el teléfono del cliente.** Arriba eliges si escribes como **Ana Pérez** (minorista) o como
  **Emporio Dos Hermanos** (mayorista, con sus precios). Escribes abajo y Enter envía. Los botones y las
  listas del chatbot se tocan con el mouse. «📍 Compartir ubicación» manda una ubicación de ejemplo y
  «💳 Simular pago» hace que Khipu confirme el último cobro.
- **A la derecha, el equipo de Café.** La **bandeja** con las conversaciones abiertas: las que esperan a una
  persona aparecen destacadas, con el motivo. Ahí respondes (lo ves llegar al teléfono de la izquierda),
  tomas, pausas o resuelves. Debajo, los **avisos** que el equipo recibió por WhatsApp y el **gasto del
  modelo** del mes: cuántas llamadas, cuántos tokens y, si configuraste la tarifa, cuántos dólares (punto 9).

## 6. Probar una conversación

En el simulador estás escribiéndole al WhatsApp de Café como **Ana Pérez**. Cada Enter es un mensaje: puedes
mandar varios seguidos, como un cliente. El chatbot espera a que termines y responde **una sola vez** a todo;
mientras tanto, bajo el chat dice «El chatbot espera a que termines de escribir…» y luego «El chatbot está
escribiendo…».

Un ejemplo paso a paso (las palabras del chatbot cambian, porque las escribe el modelo; los precios y el total
no, porque salen del catálogo):

1. Escribe tres mensajes seguidos, sin esperar: `hola buenas`, `quiero café para Ñuñoa` y
   `¿qué futaleufú tienen?`. Después de la espera, el chatbot responde una vez con la lista de cafés y su
   precio ($9.990 para Ana).
2. Toca el café que quieras en la lista y dile cuánto: `quiero 2 bolsas`.
3. Si el chatbot pide tu dirección de despacho, toca «📍 Compartir ubicación».
4. Llega el **resumen** con el despacho de Ñuñoa, el total ($23.970) y los botones «Confirmar» y «Cambiar
   algo». Toca **Confirmar**: llega el botón «Pagar» (es de mentira).
5. Toca «💳 Simular pago»: Khipu «confirma» y llega el aviso de pago recibido.
6. Mira el **gasto del modelo** a la derecha: subió una llamada por cada respuesta que escribió el modelo.
   Confirmar y pagar no usaron el modelo.
7. Escribe `quiero hablar con una persona`. A la derecha aparece el **aviso al equipo** y la conversación en
   la **bandeja**, destacada y con el motivo; el chatbot deja de responder ahí. Escribe tu nombre arriba del
   panel, responde a Ana desde la bandeja (lo ves llegar a su teléfono) y, cuando termines, toca
   **Resolver**: el próximo mensaje de Ana lo vuelve a atender el chatbot.

Cambia a **Emporio Dos Hermanos** arriba del teléfono para ver los precios mayoristas.

Para cambiar un precio, una zona o una pregunta de ejemplo, edita `local/semilla/datos.ts` y vuelve a correr
`pnpm semilla`; en producción se editan los archivos de `definiciones/` y se corre `pnpm cargar`.

**Desde la terminal** (opcional, lo mismo sin navegador): en otra terminal, `pnpm conversar` para escribir
como Ana (`--cliente mayorista` para Emporio; botones y listas se eligen con el número, `/ubicacion`,
`/pagar`, `/ayuda` y `/salir`), y `pnpm bandeja` para atender como el equipo:

```bash
pnpm bandeja                                    # las que esperan a una persona
pnpm bandeja ver 56911112222                    # el hilo de Ana
pnpm bandeja responder 56911112222 --como Rodo Hola Ana, te ayudo yo
pnpm bandeja resolver 56911112222               # la cierra: el chatbot vuelve a atender a Ana
```

## 7. Problemas comunes

**«El puerto 8092 está ocupado (¿quedó abierto otro pnpm local?)»** (o el 8093). Seguramente tienes otro
`pnpm local` abierto en otra terminal: ciérralo con `Ctrl+C`. Si el puerto lo usa otro programa, elige otro
en `.env`: `CAFE_PUERTO=8100` o `CAFE_DOBLES_PUERTO=8101` (el simulador queda en ese puerto:
http://localhost:8101/).
`pnpm conversar` lee los mismos valores de `.env`.

**«No pude conectarme a PostgreSQL en 127.0.0.1:5433 … ¿Está arriba la base?»** Docker Desktop está cerrado
o la base no está levantada. Abre Docker Desktop, espera a que diga que está corriendo, y luego
`docker compose up -d` y `docker compose ps` (debe decir `healthy`). Si `docker compose` responde que no
puede conectarse a Docker, es lo mismo: Docker Desktop no está abierto.

**«Falta OPENAI_API_KEY en .env»**. `pnpm local` no arranca sin la clave. Revisa el paso 3: la línea debe
ser `OPENAI_API_KEY=sk-...`, sin `#` al principio y sin espacios. Si `pnpm local` arranca pero el chatbot no responde o le pasa todo a
la encargada, revisa en https://platform.openai.com que la clave siga activa y que tengas saldo.

**La semilla se niega a correr.** Por seguridad, la semilla y `pnpm local` solo trabajan con una base de tu
propio computador cuyo nombre empiece por `cafe_dev`. Si dice «Falta DATABASE_URL», «no es local» o «no
parece de desarrollo», revisa que en `.env` esté
`DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafe_dev` (o el puerto de tu PostgreSQL). Si dice
«CAFE_ENV=produccion», cambia esa línea a `CAFE_ENV=desarrollo`.

**El simulador no carga, o `pnpm conversar` dice «No encuentro el modo local…».** Primero tiene que estar
corriendo `pnpm local` (y su terminal, abierta).

**El chatbot responde «Le dejé tu mensaje al equipo…» y no te atiende.** No te reconoce como cliente: falta la
semilla. Corre `pnpm semilla` con la base arriba y vuelve a escribir.

## 8. Seguir desarrollando con Claude Code

El proyecto está preparado para que lo sigas mejorando con Claude Code, sin escribir código tú.

1. Instala Claude Code (https://claude.com/claude-code), abre una terminal en la carpeta del proyecto y
   escribe `claude`.
2. Pide el cambio en lenguaje simple, como se lo pedirías a una persona: «quiero que `pnpm bandeja` muestre
   los pedidos del cliente», «agrega la comuna de Macul a Santiago oriente en la semilla». Claude ya conoce
   las reglas del proyecto (están en `CLAUDE.md`): primero te propone qué va a cambiar, después escribe la
   prueba que lo demuestra y recién entonces el código.
3. Antes de dar algo por bueno, pídele (o corre tú) la revisión completa:

   ```bash
   pnpm verify
   ```

   Tiene que terminar sin errores. Si el cambio toca una conversación, pídele además las pruebas
   de punta a punta. Luego pruébalo tú mismo con `pnpm local` y el simulador, como en el paso 6.

Hay cosas que Claude no va a hacer aunque se lo pidas, porque protegen el negocio: el precio siempre sale del
catálogo (nunca lo inventa el modelo), se respeta el consentimiento de cada cliente, y nunca se usan claves
reales ni la base de producción en las pruebas.

## 9. Proveedor del modelo y costos

**Qué consume tokens.** Solo las respuestas que escribe el modelo. El chatbot espera a que el cliente termine
de escribir y hace **una llamada al modelo por cada tanda de mensajes**, no una por mensaje. No usan el modelo:
tocar «Confirmar», pagar, pedir una persona (pasa directo a la encargada), los avisos al equipo ni nada de lo
que hace `pnpm bandeja`. La base de datos y los simuladores de WhatsApp y Khipu no cuestan nada.

**Cuánto cuesta.** Cada llamada manda las reglas del chatbot, el catálogo sin montos, las preguntas frecuentes
y los últimos intercambios: unos pocos miles de tokens de entrada (una parte se repite y el proveedor la cobra
más barata, «cacheada») y unos cientos de salida. Con los precios típicos de un modelo mediano, una
conversación de prueba completa cuesta **unos pocos centavos de dólar**; revisa la tarifa vigente de tu
modelo en la página de precios del proveedor. En el simulador (punto 5) ves las llamadas, los tokens y el
gasto del mes mientras pruebas.

**Qué proveedor conectar.** Por defecto, **OpenAI** (punto 1). Sirve cualquier proveedor **compatible con la
API de OpenAI** (`/chat/completions` con llamadas a funciones), por ejemplo OpenRouter, Groq o Together. Se
cambia en `.env` con tres líneas:

```bash
OPENAI_API_KEY=la-clave-de-ese-proveedor        # se llama así aunque el proveedor sea otro
CAFE_MODELO_BASE_URL=https://openrouter.ai/api/v1   # la dirección que indica el proveedor
CAFE_MODELO=nombre-del-modelo                    # tal como lo escribe el proveedor
```

El modelo tiene que saber **llamar funciones** (function calling / tools): el chatbot le pide su decisión de
esa forma. Si con otro modelo las respuestas salen raras o todo pasa a la encargada, vuelve al de OpenAI.

**Cómo controlar el gasto.** Tres capas, de afuera hacia adentro:

1. **En el proveedor**: un tope mensual (en OpenAI, **Limits**). Es la red de seguridad final.
2. **En el chatbot**: `CAFE_LIMITE_GASTO_USD_MES` (50 dólares por defecto). El equipo recibe un aviso al 50,
   80 y 100 %; al 100 % el chatbot deja de usar el modelo y pasa los mensajes a la encargada hasta el mes
   siguiente.
3. **La tarifa** `CAFE_MODELO_TARIFA_USD_POR_MTOK=entrada,cacheada,salida`: los dólares por millón de tokens
   de tu modelo, copiados de la página de precios del proveedor (por ejemplo `1.25,0.125,10`). **Sin tarifa el
   chatbot cuenta tokens pero no dólares**, así que el límite del punto 2 no puede cortar. En producción es
   obligatoria; en local es opcional, pero ponla si quieres ver el gasto en dólares en el simulador.

## Nota: publicar en producción

Esta guía es para probar en tu computador. Publicarlo para clientes reales queda a cargo de Café: el
hosting (un servidor con PostgreSQL 16 y una dirección pública con HTTPS), el número real de WhatsApp en la
app de Meta con sus plantillas aprobadas, y la cuenta real de Khipu. Lo que hay que configurar está en
`docs/entrega.md`, en «Qué se configura».
