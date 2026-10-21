# Manual: publicar el chatbot en un servidor (Contabo), paso a paso

Esta guía es para quien nunca ha administrado un servidor. Si la sigues en orden, al final el chatbot queda
atendiendo el WhatsApp real de Café, con HTTPS, respaldos y comandos simples para el día a día. Tómate una tarde:
lo más lento no es lo técnico, son las aprobaciones de Meta (plantillas y número).

Cada comando se copia y se pega tal cual en la terminal y se confirma con Enter. Lo que va después de `#` es
una explicación: no hace falta copiarlo. Donde dice `TU_IP` o `chatbot.tudominio.cl`, pon tus datos.

> Antes de publicar, prueba todo en tu computador con el simulador (`SETUP.md`). Si ahí funciona, aquí también.

---

## 0. Lista de compras (qué necesitas tener)

| Qué | Para qué | Dónde |
|---|---|---|
| **Un VPS** (servidor arrendado) | Donde vive el chatbot, encendido 24/7 | contabo.com (este manual) |
| **Un dominio** (por ejemplo `cafeaconcagua.cl`) | WhatsApp y Khipu exigen una dirección con HTTPS | El que ya tiene Café (NIC Chile, Cloudflare, etc.) |
| **Clave del modelo** (OpenAI u otro compatible) | El chatbot "piensa" con el modelo | platform.openai.com (`SETUP.md`, punto 1 y 9) |
| **Cuenta Meta Business + app de WhatsApp** | El número de WhatsApp de Café en la API oficial | business.facebook.com y developers.facebook.com |
| **Cuenta Khipu de cobrador** (opcional) | Cobrar con el botón «Pagar» | khipu.com |
| **Acceso al repositorio en GitHub** | Bajar el código al servidor | github.com |

**Costos aproximados** (revisa siempre el precio vigente en cada sitio): el VPS más chico de Contabo cuesta
del orden de unos pocos dólares o euros al mes; el dominio, lo que ya pagan; el modelo, unos pocos dólares al
mes con poco tráfico (lo controla el límite de gasto, ver punto 9 de `SETUP.md`); WhatsApp cobra por
conversación según la tarifa de Meta para Chile; Khipu cobra una comisión por pago.

---

## 1. Contratar el VPS en Contabo

1. Entra a **https://contabo.com** y ve a **VPS** (o «Cloud VPS»).
2. Elige el **plan más barato**: alcanza de sobra. Fíjate que tenga **al menos 2 vCPU y 4 GB de RAM** (los
   planes de Contabo traen más que eso).
3. Opciones del pedido:
   - **Plazo**: mensual está bien para empezar (algunos plazos cobran un cargo de instalación; revísalo antes
     de pagar).
   - **Región**: la más cercana a Chile que ofrezcan (por ejemplo Estados Unidos). No es crítico: WhatsApp no
     necesita velocidad extrema.
   - **Imagen / sistema operativo**: **Ubuntu 24.04** (sin panel, sin extras).
   - **Contraseña de root**: inventa una larga y **guárdala en un gestor de contraseñas**. Es la llave del
     servidor.
   - No necesitas almacenamiento adicional, ni panel de control, ni licencias.
4. Paga (tarjeta o PayPal). En unos minutos (a veces unas horas) llega un **correo de Contabo** con la
   **dirección IP** del servidor (cuatro números separados por puntos, como `185.12.34.56`). Esa es `TU_IP`.

---

## 2. Apuntar el dominio al servidor

El chatbot va a vivir en un subdominio, por ejemplo **`chatbot.cafeaconcagua.cl`**.

1. Entra al lugar donde administras el DNS del dominio (NIC Chile, Cloudflare, el hosting de la web…).
2. Crea un registro:
   - **Tipo**: `A`
   - **Nombre**: `chatbot`
   - **Valor / apunta a**: `TU_IP`
   - **TTL**: automático (o 300). Si es Cloudflare, deja la **nube gris** («solo DNS»), no la naranja.
3. Espera unos minutos y compruébalo desde tu computador:

   ```bash
   ping chatbot.cafeaconcagua.cl      # debe responder TU_IP (Ctrl+C para cortar)
   ```

---

## 3. Entrar al servidor

Desde tu computador (Mac: app «Terminal»; Windows: «PowerShell»):

```bash
ssh root@TU_IP
```

La primera vez pregunta si confías en el servidor: escribe `yes`. Luego pide la contraseña de root (no se ve
mientras escribes, es normal). Si ves algo como `root@vmi…:~#`, **estás dentro del servidor**. Todo lo que
sigue se escribe ahí. Para salir: `exit`.

---

## 4. Preparar el servidor (una sola vez)

Copia y pega estos bloques, uno por uno:

```bash
# Actualizar el sistema (puede tardar unos minutos; si pregunta algo, Enter)
apt update && apt upgrade -y

# Firewall: solo SSH (para entrar), 80 y 443 (web con HTTPS)
apt install -y ufw git
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# Actualizaciones de seguridad automáticas
apt install -y unattended-upgrades && dpkg-reconfigure -f noninteractive unattended-upgrades

# Docker (corre el chatbot, la base de datos y el HTTPS)
curl -fsSL https://get.docker.com | sh
docker --version                    # debe mostrar una versión
```

---

## 5. Bajar el chatbot

El repositorio es privado, así que GitHub te pedirá una clave de acceso (token):

1. En GitHub: tu foto → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
2. Nombre: `vps-cafe`. Expiración: la que prefieras (luego se renueva). **Repository access**: «Only select
   repositories» → `cafe-aconcagua-chatbot`. **Permissions** → Repository → **Contents: Read-only**.
3. Genera el token y cópialo (empieza por `github_pat_`). Se muestra una sola vez.

En el servidor:

```bash
git config --global credential.helper store    # recuerda el token para las actualizaciones
cd /opt
git clone https://github.com/Mkrsun/cafe-aconcagua-chatbot.git
# Username: tu usuario de GitHub · Password: pega el token (no se ve, es normal)
cd /opt/cafe-aconcagua-chatbot
```

> Desde ahora, **todos los comandos se corren dentro de `/opt/cafe-aconcagua-chatbot`**. Si te pierdes:
> `cd /opt/cafe-aconcagua-chatbot`.

---

## 6. Configurar (`deploy/produccion.env`)

```bash
cp deploy/produccion.env.example deploy/produccion.env
openssl rand -hex 24                # copia lo que sale: es la clave de la base de datos
nano deploy/produccion.env
```

Se abre el editor. Completa cada línea que dice `<-- COMPLETAR` (después del `=`, sin espacios ni comillas).
Muévete con las flechas; para guardar **Ctrl+O** y Enter; para salir **Ctrl+X**.

- `CAFE_DOMINIO`: `chatbot.cafeaconcagua.cl` (tu subdominio del punto 2).
- `CAFE_DB_CLAVE`: lo que generó `openssl rand -hex 24`. **No la cambies después.**
- `OPENAI_API_KEY` y `CAFE_MODELO_TARIFA_USD_POR_MTOK`: ver `SETUP.md`, punto 9.
- Lo de **WhatsApp** y **Khipu** lo completas en los puntos 9 y 10; por ahora deja esas líneas como están.
- `CAFE_EQUIPO_WHATSAPP`: los celulares del equipo que reciben los avisos (ej. `56911112222,56933334444`).

Este archivo tiene secretos: **no lo copies a otro lado, no lo subas a GitHub, no lo mandes por chat**.

---

## 7. Arrancar

```bash
./deploy/cafe arrancar              # la primera vez tarda unos minutos (construye todo)
./deploy/cafe estado                # debe decir «Chatbot: responde»
```

Abre en tu navegador **https://chatbot.cafeaconcagua.cl/salud**: tiene que mostrar `{"ok":true}` con el
candado de HTTPS. El certificado lo pide solo (Caddy, con Let's Encrypt) y se renueva solo.

Si no arranca: `./deploy/cafe logs` muestra el motivo (casi siempre una variable que falta en
`produccion.env`; corrígela y vuelve a `./deploy/cafe arrancar`).

---

## 8. Cargar el catálogo y los clientes

**Catálogo, precios, despacho, preguntas frecuentes y notas de cata** viven en `definiciones/` (ver
`README.md`). Lo ideal es
editarlos en GitHub (o con Claude Code) y luego, en el servidor:

```bash
./deploy/cafe actualizar            # baja la última versión
./deploy/cafe cargar                # deja la base igual a definiciones/ y dice qué cambió
```

**Clientes**: prepara en tu computador el archivo `clientes.json` (formato en `README.md`) y súbelo al
servidor **desde tu computador** (no desde el servidor):

```bash
scp clientes.json root@TU_IP:/opt/cafe-aconcagua-chatbot/deploy/clientes/
```

Y en el servidor:

```bash
./deploy/cafe clientes clientes.json
```

Cada vez que cambies el archivo, repite estos dos pasos. Un número que no está en los clientes recibe un saludo
y el equipo recibe un aviso para agregarlo.

---

## 9. Conectar WhatsApp (Meta)

Los nombres de los menús de Meta cambian seguido; si algo no calza exacto, busca la opción equivalente.

1. **Cuenta Meta Business**: en https://business.facebook.com, con los datos de Café (puede pedir
   verificación del negocio).
2. **App**: en https://developers.facebook.com → **Mis apps** → **Crear app** → tipo **Business** → agrega el
   producto **WhatsApp**.
3. **Número**: en WhatsApp → **Configuración de la API**, agrega el número de Café y verifícalo por SMS o
   llamada. Ojo: un número usado en la app de WhatsApp normal debe darse de baja ahí primero. Copia el
   **Identificador del número de teléfono** → `WHATSAPP_PHONE_NUMBER_ID`.
4. **Token permanente**: en business.facebook.com → **Configuración del negocio** → **Usuarios del sistema** →
   crea uno (rol administrador), **asígnale la app**, y **Generar token** con los permisos
   `whatsapp_business_messaging` y `whatsapp_business_management`, sin vencimiento → `META_ACCESS_TOKEN`.
5. **Secreto de la app**: en la app → **Configuración** → **Básica** → **Clave secreta de la app** (Mostrar) →
   `WHATSAPP_APP_SECRET`.
6. **Token de verificación**: inventa una palabra larga (ej. `cafe-verifica-2026-xyz`) →
   `WHATSAPP_VERIFY_TOKEN`.
7. Completa esas cuatro líneas en `deploy/produccion.env` (`nano deploy/produccion.env`) y aplica:
   `./deploy/cafe arrancar`.
8. **Webhook**: en la app → WhatsApp → **Configuración** → Webhook → **Editar**:
   - URL de devolución de llamada: `https://chatbot.cafeaconcagua.cl/webhooks/whatsapp`
   - Token de verificación: la palabra del paso 6.
   - **Verificar y guardar**. Luego, en **Campos del webhook**, suscribe **`messages`**.
9. **Plantillas** (WhatsApp Manager → **Plantillas de mensajes** → Crear), categoría **Utilidad**, idioma
   **Español**. Los nombres deben coincidir con `produccion.env`:
   - `pago_recibido`: «¡Hola {{1}}! Recibimos tu pago de {{2}}. Ya estamos preparando tu pedido. Gracias por
     preferir Café Aconcagua.»
   - `aviso_al_equipo`: «Cliente: {{1}}. Motivo: {{2}}. Resumen: {{3}}. Respóndele desde la bandeja.»

   La aprobación puede tardar de minutos a un día. Sin la plantilla de aviso, el equipo recibe los avisos solo
   si le escribió al número de Café en las últimas 24 horas.

---

## 10. Conectar Khipu (cobros)

1. En tu cuenta de cobrador de Khipu, busca la sección de **integración / API** y crea una **API key (API v3)**
   → `KHIPU_API_KEY`.
2. `KHIPU_NOTIFY_URL=https://chatbot.cafeaconcagua.cl/payments/khipu/webhook` (con tu dominio).
3. Guarda y aplica: `./deploy/cafe arrancar`.

Sin Khipu, el chatbot igual toma pedidos: al confirmar, le pasa el pedido a la encargada para que lo cobre.

---

## 11. Prueba final, de verdad

1. Agrega tu propio celular a `clientes.json` y cárgalo (punto 8).
2. Escríbele al WhatsApp de Café: «hola, ¿qué cafés tienen?». Debe responder en unos 25 segundos.
3. Pide «quiero hablar con una persona»: el celular del equipo recibe el aviso y en el servidor
   `./deploy/cafe bandeja` muestra la conversación.
4. Si algo no responde, mira `./deploy/cafe logs` mientras escribes.

---

## 12. El día a día

Entra con `ssh root@TU_IP`, luego `cd /opt/cafe-aconcagua-chatbot`, y:

```bash
./deploy/cafe bandeja                                   # quién espera a una persona
./deploy/cafe bandeja ver 56933334444                   # el hilo de un cliente
./deploy/cafe bandeja responder 56933334444 --como Glei Hola, te ayudo yo
./deploy/cafe bandeja resolver 56933334444              # la cierra: vuelve el chatbot
./deploy/cafe logs                                      # qué está pasando (Ctrl+C sale)
./deploy/cafe                                           # la lista de todos los comandos
```

**Respaldo diario automático** (una sola vez):

```bash
crontab -e                          # si pregunta el editor, elige nano (1)
```

Agrega al final esta línea, guarda y sal:

```
30 4 * * * cd /opt/cafe-aconcagua-chatbot && ./deploy/cafe respaldo >> deploy/respaldos.log 2>&1
```

Cada día a las 4:30 queda una copia en `deploy/respaldos/`. **Baja una copia a tu computador cada tanto**
(desde tu computador): `scp -r root@TU_IP:/opt/cafe-aconcagua-chatbot/deploy/respaldos ./respaldos-cafe`.

**Actualizar a una versión nueva** (después de que se integre un cambio en GitHub):

```bash
./deploy/cafe actualizar
```

---

## 13. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `https://…/salud` no abre | `./deploy/cafe estado`. Revisa que el DNS apunte a `TU_IP` (punto 2) y que el firewall tenga 80 y 443. |
| El candado HTTPS no aparece | El DNS todavía no se propaga o Cloudflare está en «nube naranja». Espera y `./deploy/cafe arrancar`. |
| `./deploy/cafe logs` dice que falta una variable | Complétala en `deploy/produccion.env` y `./deploy/cafe arrancar`. |
| Meta no verifica el webhook | El token de verificación en Meta no es igual al de `produccion.env`, o el dominio no tiene HTTPS aún. |
| El chatbot no responde a un cliente | ¿Está en `clientes.json` y lo cargaste? ¿La conversación está pausada en la bandeja? |
| Todo pasa a la encargada | Precios pendientes o preguntas faltantes en `definiciones/`, o se llegó al límite de gasto (los avisos del 50/80/100 % llegan al equipo). |
| Olvidé la contraseña de root | En el panel de Contabo hay una opción para restablecerla. |

---

## 14. Sugerencias (recomendadas, no obligatorias)

- **Entrar con llave SSH en vez de contraseña.** Más seguro y sin escribir la contraseña cada vez. Pídele a
  Claude Code: «ayúdame a configurar una llave SSH para mi VPS y desactivar el login con contraseña».
- **Snapshots en Contabo** antes de cambios grandes (desde su panel): una foto completa del servidor para
  volver atrás.
- **Copias fuera del servidor**: además de los respaldos diarios, guarda uno por semana en otro lado (tu
  computador o un drive). Un respaldo que vive solo en el mismo servidor no sirve si el servidor se pierde.
- **Monitoreo gratis**: crea un monitor en https://uptimerobot.com contra `https://chatbot.tudominio.cl/salud`
  para que te avise por correo si el chatbot se cae.
- **Topes de gasto en dos lugares**: el límite del chatbot (`CAFE_LIMITE_GASTO_USD_MES`) y el tope mensual en
  la cuenta del proveedor del modelo.
- **Prueba primero en local**: cualquier cambio de precios, preguntas o código, pruébalo con `pnpm local` y el
  simulador antes de `./deploy/cafe actualizar`.
- **Empieza con pocos clientes**: carga primero al equipo y a unos clientes de confianza; cuando todo ande
  bien, carga el resto.
- **Renueva el token de GitHub** antes de que venza (punto 5); si vence, `./deploy/cafe actualizar` lo pedirá
  de nuevo.
- **Un solo `produccion.env`, guardado en un gestor de contraseñas**: si se pierde el servidor, con él, el
  repositorio y un respaldo, se vuelve a levantar todo en una hora.
