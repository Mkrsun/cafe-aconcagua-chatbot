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
   centavos de dólar. Puedes poner un tope mensual en **Limits** para quedarte tranquilo.
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
  Modelo:           gpt-6-luna (real, con tu OPENAI_API_KEY)
  WhatsApp y Khipu: dobles en http://127.0.0.1:8093 (no sale ningún mensaje ni cobro real)

Para conversar como cliente, en otra terminal: pnpm conversar
  (o pnpm conversar --cliente mayorista)
Para atender como el equipo: pnpm bandeja (pnpm bandeja ayuda muestra los comandos)
Ctrl+C cierra todo.
```

Deja esta terminal abierta: mientras siga abierta, el
chatbot está funcionando. Para apagarlo, vuelve a ella y presiona `Ctrl+C`.

## 6. Probar una conversación

Abre **otra terminal**, entra a la misma carpeta (`cd cafe-aconcagua-chatbot`) y corre:

```bash
pnpm conversar
```

Ahora eres **Ana Pérez** escribiéndole al WhatsApp de Café. (Con `pnpm conversar --cliente mayorista` eres
Emporio Dos Hermanos y ves los precios mayoristas.)

Cómo se usa:

- Cada línea que escribes y confirmas con Enter es un mensaje de WhatsApp. Puedes mandar varias seguidas,
  como lo hace un cliente: el chatbot espera a que termines y responde **una sola vez** a todo.
- Mientras espera verás `… El chatbot espera a que termines de escribir`, y cuando se pone a responder,
  `… El chatbot está escribiendo`.
- Cuando el chatbot manda botones o una lista, salen numerados: escribe **solo el número** para elegir.
- `/ubicacion` comparte una ubicación de ejemplo (Plaza Ñuñoa), `/pagar` simula que Khipu confirma el pago
  del último botón «Pagar», `/ayuda` muestra los comandos y `/salir` termina.

Un ejemplo paso a paso (las palabras del chatbot cambian, porque las escribe el modelo; los precios y el total
no, porque salen del catálogo):

1. Escribe tres mensajes seguidos, sin esperar:

   ```
   hola buenas
   quiero café para Ñuñoa
   ¿qué futaleufú tienen?
   ```

   Después de la espera, el chatbot responde una vez, con la lista de cafés y su precio:

   ```
   … El chatbot espera a que termines de escribir
   … El chatbot está escribiendo
   Chatbot: ¡Hola, Ana! Estos son nuestros Futaleufú:
     1) Futaleufú — 150 gramos … · $9.990 · Futaleufú — 150 gramos / Grano entero
     2) Futaleufú — 150 gramos … · $9.990 · Futaleufú — 150 gramos / Molido
   ```

2. Elige de la lista con un número, por ejemplo `2`, y dile cuánto quieres: `quiero 2 bolsas`.
3. Si el chatbot pide tu dirección de despacho, escribe `/ubicacion`.
4. El chatbot manda el **resumen** con el despacho de Ñuñoa y el total, y los botones:

   ```
   Total: $23.970
   ¿Lo dejamos así?
     1) Confirmar
     2) Cambiar algo
   ```

   Escribe `1` para **Confirmar**. Llega el botón «Pagar» con su enlace (es de mentira: no lo abras).
5. Escribe `/pagar`. Khipu «confirma» el pago y llega el aviso de pago recibido:

   ```
   (Khipu confirmó el pago khipu-e2e-1)
   Chatbot (plantilla payment_received): Ana Pérez · $23.970
   ```

6. Prueba también pedir una persona: `quiero hablar con una persona`. Verás el **aviso al equipo** y el
   chatbot deja de responder en esa conversación hasta que alguien la retome.
7. `/salir` para terminar.

**Atender como el equipo**: abre una tercera terminal en la misma carpeta y corre `pnpm bandeja`. Ahí ves las
conversaciones que esperan a una persona, con su motivo:

```bash
pnpm bandeja                                    # las que esperan a una persona
pnpm bandeja ver 56911112222                    # el hilo de Ana
pnpm bandeja responder 56911112222 --como Rodo Hola Ana, te ayudo yo
pnpm bandeja reanudar 56911112222               # el chatbot vuelve a atender
```

Tu respuesta aparece en `pnpm conversar`, como le llegaría a Ana por WhatsApp. Para cambiar un precio, una
zona o una pregunta de ejemplo, edita `local/semilla/datos.ts` y vuelve a correr `pnpm semilla`; en
producción se editan los archivos de `definiciones/` y se corre `pnpm cargar`.

## 7. Problemas comunes

**«El puerto 8092 está ocupado (¿quedó abierto otro pnpm local?)»** (o el 8093). Seguramente tienes otro
`pnpm local` abierto en otra terminal: ciérralo con `Ctrl+C`. Si el puerto lo usa otro programa, elige otro
en `.env`: `CAFE_PUERTO=8100` o `CAFE_DOBLES_PUERTO=8101`.
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

**«No encuentro el modo local en http://127.0.0.1:8092»** al correr `pnpm conversar`. Primero tiene que
estar corriendo `pnpm local` en otra terminal.

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
   de punta a punta. Luego pruébalo tú mismo con `pnpm local`, `pnpm conversar` y `pnpm bandeja`, como en el paso 6.

Hay cosas que Claude no va a hacer aunque se lo pidas, porque protegen el negocio: el precio siempre sale del
catálogo (nunca lo inventa el modelo), se respeta el consentimiento de cada cliente, y nunca se usan claves
reales ni la base de producción en las pruebas.

## Nota: publicar en producción

Esta guía es para probar en tu computador. Publicarlo para clientes reales queda a cargo de Café: el
hosting (un servidor con PostgreSQL 16 y una dirección pública con HTTPS), el número real de WhatsApp en la
app de Meta con sus plantillas aprobadas, y la cuenta real de Khipu. Lo que hay que configurar está en
`docs/entrega.md`, en «Qué se configura».
