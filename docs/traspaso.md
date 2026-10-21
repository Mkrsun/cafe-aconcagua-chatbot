# Traspaso: tomar el proyecto desde cero

Esta guía es para quien continúa el chatbot de Café Aconcagua con **otra cuenta de Claude Code**, sin haber
estado en el desarrollo. Con ella se llega, en orden, a: entender qué hay, tenerlo corriendo en tu
computador, saber qué falta para publicarlo y seguir mejorándolo con Claude sin romper lo que funciona.

Estado al **21 de octubre de 2026**: el producto está completo y probado con dobles. Falta lo que solo puede
poner Café: precios, zonas de despacho, preguntas frecuentes, notas de cata y las cuentas reales
(WhatsApp, Khipu y el servidor).

| Si quieres… | Lee |
|---|---|
| Saber qué hace el producto, en simple | [`docs/entrega.md`](entrega.md) |
| Probarlo en tu computador, paso a paso | [`SETUP.md`](../SETUP.md) |
| Publicarlo en un servidor | [`docs/manual-produccion.md`](manual-produccion.md) |
| Las reglas que sigue Claude en este repo | [`CLAUDE.md`](../CLAUDE.md) |
| Variables, comandos y formato de clientes | [`README.md`](../README.md) |

---

## 1. Qué es, en una página

Un cliente escribe por WhatsApp. El chatbot espera a que termine (agrupa la ráfaga), decide qué hacer con
**una** llamada al modelo y responde. El precio, el resumen del pedido, el despacho y el enlace de pago los
escribe **el sistema**, nunca el modelo. Cuando hace falta una persona, avisa al equipo por WhatsApp y deja
la conversación en la bandeja, que el equipo atiende desde la terminal.

```
WhatsApp ──webhook firmado──▶ entrantes ─▶ espera humana (agrupa) ─▶ cola durable
                                                                        │
                ┌───────────────────────── despachador (cada 1 s) ◀──────┘
                ▼
            Turno ──▶ ¿sin modelo? (enojo, «sí», «no», «gracias»)
                │        └─ no ─▶ contexto (reglas + catálogo + notas de cata | cliente, recuerdo,
                │                  estado, FAQ, mensaje) ─▶ modelo (Responses API, decidir_turno)
                │                  ─▶ validar (montos, SKU, enlaces…) ─▶ 1 reparación como máximo
                ▼
          decisión: RESPONDER · PREGUNTAR · PROPONER · CONFIRMAR · DERIVAR
                │
                ├─ marcadores {{precio:SKU}} {{precios:FAMILIA}} {{despacho}} {{resumen}} {{pago}}
                │   → montos del tramo del cliente leídos de PostgreSQL
                ├─ PROPONER → resumen + botones «Confirmar / Cambiar algo»
                ├─ «sí» → pedido + cobro Khipu → botón «Pagar» → aviso de pago recibido
                └─ DERIVAR / enojo / error → aviso al equipo → conversación pausada en la bandeja
```

Los cinco **bordes** (WhatsApp, modelo, Khipu, PostgreSQL y reloj) tienen cada uno un puerto en `puertos/`,
un doble para pruebas y un adaptador real, y los dos pasan la misma suite de contrato. Todo lo demás es
código directo, organizado por área del negocio en `src/` (el mapa completo está en `CLAUDE.md`).

### Lo que el chatbot sabe en cada turno

| Dato | De dónde sale | Dónde se cambia |
|---|---|---|
| Reglas y voz | `src/turno/dominio/contexto.ts` | Código (medir con `pnpm banco`) |
| Catálogo (sin montos) | PostgreSQL, cargado de `definiciones/catalogo.ts` | `definiciones/` + `pnpm cargar` |
| Notas de cata de cada café | Registros duraderos, de `definiciones/perfiles.ts` | `definiciones/` + `pnpm cargar` |
| Preguntas frecuentes | Registros duraderos, de `definiciones/preguntas-frecuentes.ts` | `definiciones/` + `pnpm cargar` |
| Zonas de despacho | PostgreSQL, de `definiciones/despacho.ts` | `definiciones/` + `pnpm cargar` |
| El cliente (nombre, tipo, tramo) | CRM, de un archivo JSON fuera del repo | `pnpm cargar --clientes archivo.json` |
| Recuerdo del cliente | Sus notas (lo anota el modelo) y sus 3 últimos pedidos, sin montos | `pnpm bandeja recuerdo / olvidar` |
| La conversación en curso | Últimos 10 intercambios, pedido en curso, comuna, reclamo | Se reinicia al resolverla |
| Día y hora | Reloj, en hora de Chile | — |

---

## 2. Qué se hizo en la última etapa

Todo está integrado en `main` (21 de octubre de 2026): no quedan PRs abiertos. Cada PR conserva su
descripción con la evidencia (pruebas y mediciones), útil para entender por qué se hizo cada cosa:

| PR | Qué trajo |
|---|---|
| [#1](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/1) | El producto completo: WhatsApp, turno, catálogo, pedidos, Khipu, bandeja, CRM, simulador y despliegue |
| [#2](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/2) | El modelo por la Responses API de OpenAI, con razonamiento (`medium`) |
| [#3](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/3) | 7 errores que el cliente veía: «el precio cambió» falso, $0, precio repetido, SKU visible, listas vacías… |
| [#4](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/4) | `pnpm banco`: conversaciones reales contra el modelo, con informe |
| [#5](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/5) | Voz más cálida y natural (de 18/22 a 22/22 en el banco) |
| [#6](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/6) | Notas de cata por café (plantilla vacía para completar) |
| [#7](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/7) | Memoria del cliente entre conversaciones |
| [#8](https://github.com/Mkrsun/cafe-aconcagua-chatbot/pull/8) | Esta guía y la documentación al día |

Desde ahora, cada cambio va en su rama con su PR a `main`, y el CI de GitHub (`verify` y las tres suites
de punta a punta) tiene que quedar en verde antes de integrarlo.

---

## 3. Lo que necesitas tener

| Qué | Para qué | Obligatorio para |
|---|---|---|
| Acceso al repo `Mkrsun/cafe-aconcagua-chatbot` en GitHub | Clonar, integrar PRs | Todo |
| Una cuenta de **Claude Code** (claude.com/claude-code) | Seguir desarrollando | Desarrollar |
| Node 24, pnpm 10 y Docker Desktop (o PostgreSQL 16) | Correrlo en local | Probar en local |
| Una clave de **OpenAI** (`OPENAI_API_KEY`) | El modelo que conversa | Probar en local y producción |
| La app de **Meta** (WhatsApp Cloud API) con el número de Café y 2 plantillas aprobadas | Hablar con clientes reales | Producción |
| Una cuenta de **Khipu** | Cobrar | Producción (sin ella, cobra una persona) |
| Un VPS con dominio y HTTPS | Publicarlo | Producción |

Las claves **nunca** van al repo ni a un chat: viven en `.env` (local) o en `deploy/produccion.env`
(servidor), y los dos están en `.gitignore`.

---

## 4. Ponerlo a andar en tu computador (30 minutos)

La guía detallada, con lo que vas a ver en cada paso, está en `SETUP.md`. El camino corto (si recibiste
el proyecto en un zip, descomprímelo y salta el `git clone`; para trabajar con ramas y PRs pide acceso al
repo en GitHub):

```bash
git clone https://github.com/Mkrsun/cafe-aconcagua-chatbot.git
```

```bash
cd cafe-aconcagua-chatbot && pnpm install && cp .env.example .env
```

Abre `.env` y pega tu clave en `OPENAI_API_KEY=`. Lo demás viene listo (`gpt-6-luna`, Responses API,
esfuerzo `medium`, base de Docker).

```bash
docker compose up -d
```

```bash
pnpm semilla
```

```bash
pnpm local
```

Se abre el simulador en http://localhost:8093/: a la izquierda escribes como cliente (Ana, minorista, o
Emporio, mayorista) y a la derecha atiendes como el equipo. WhatsApp y Khipu son dobles: no sale ningún
mensaje real ni se cobra nada. El modelo sí es el real, con tu clave.

Para confirmar que todo está sano:

```bash
pnpm verify
```

Las pruebas de PostgreSQL necesitan su propia base `cafe_test*` (nunca otra): créala una vez con
`docker exec cafe-aconcagua-chatbot-postgres-1 createdb -U cafe cafe_test` y corre
`DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafe_test pnpm verify`. Las de punta a punta:
`CAFE_E2E_DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafe_test pnpm e2e`.

---

## 5. Lo que falta para publicar (lo pone Café)

Hoy `definiciones/` tiene el catálogo real (39 formatos de 20 cafés), pero **sin datos del negocio**.
Mientras falten, el chatbot no inventa: pasa esas consultas a la encargada.

| Pendiente | Archivo | Estado | Qué pasa mientras falta |
|---|---|---|---|
| Precios minorista y mayorista | `definiciones/catalogo.ts` | 39 de 39 pendientes (`null`) | Toda consulta de precio o pedido va a la encargada |
| Zonas de despacho | `definiciones/despacho.ts` | Vacío | Toda comuna va a la encargada |
| Preguntas frecuentes | `definiciones/preguntas-frecuentes.ts` | Vacío | Horarios, retiro, pagos y factura van a la encargada |
| Notas de cata | `definiciones/perfiles.ts` | 20 cafés con las notas vacías | Recomienda por formato y pregunta gustos, sin sabores |
| Clientes | Un JSON **fuera** del repo | — | Un número desconocido recibe un saludo y se avisa al equipo |
| Tarifa del modelo | `CAFE_MODELO_TARIFA_USD_POR_MTOK` | Vacía | Obligatoria en producción: sin ella el límite de gasto no corta |
| Plantillas de Meta | `WHATSAPP_PAYMENT_TEMPLATE`, `WHATSAPP_HANDOFF_TEMPLATE` | — | Fuera de 24 h no sale el aviso de pago ni el aviso al equipo |

Cada archivo de `definiciones/` explica su formato con un ejemplo. Después de editar:

```bash
pnpm verify
```

```bash
pnpm cargar
```

`pnpm cargar` valida todo antes de escribir, muestra cada cambio y al final lista lo pendiente (precios y
cafés sin notas). En producción se corre con `./deploy/cafe cargar` (ver el manual).

**Las notas de cata** cambian mucho la experiencia. Con notas, ante «me gusta suavecito y uso prensa
francesa» el chatbot recomienda un café concreto y explica por qué; sin notas, solo puede preguntar. Cada
nota tiene hasta 300 caracteres y no lleva precios. El formato está explicado en `definiciones/perfiles.ts`.

---

## 6. Cómo seguir desarrollando con Claude Code

### Empezar con tu cuenta

1. Instala Claude Code y entra con tu cuenta.
2. Abre una terminal en la carpeta del repo y escribe `claude` (o abre la carpeta en la app de escritorio).
3. Claude lee `CLAUDE.md` solo: ahí están las reglas, el mapa del repo, los comandos y las líneas rojas.
   No hace falta explicarle el proyecto.
4. Pídele primero que se oriente:

   > Lee `docs/traspaso.md` y `CLAUDE.md`, corre `pnpm verify` y dime en qué estado está el proyecto y qué
   > falta para publicarlo.

### Cómo pedir cambios

Pide en simple lo que quieres que pase, no cómo programarlo. Claude sigue el método del repo: rama nueva,
prueba que falla, código mínimo, `pnpm verify` en verde, commits pequeños y PR. Ejemplos que funcionan bien:

- «Cargué los precios en `definiciones/catalogo.ts`. Revísalos, corre `pnpm cargar` en mi base local y
  `pnpm banco` para ver cómo cotiza.»
- «Cuando un cliente mayorista pide más de 50 bolsas, quiero que el chatbot avise al equipo además de armar
  el pedido.»
- «Agrega al banco un caso de un cliente que pregunta si el café es orgánico, y dime cómo responde.»
- «El chatbot está usando mucho "¡Claro!"; ajusta la voz y muéstrame el banco antes y después.»
- «Prepara la publicación siguiendo `docs/manual-produccion.md`; dime qué datos necesitas de mí.»

### Qué revisar antes de aceptar un cambio

- `pnpm verify` en verde (Claude lo pega en el PR; si no hay evidencia, no está hecho).
- Si toca una conversación: `pnpm e2e` y **`pnpm banco`** antes y después.
- Pruébalo tú en `pnpm local` con el simulador.

### Lo que Claude no hará aunque se lo pidas

Son las líneas rojas de `CLAUDE.md` y protegen el negocio: el precio sale del catálogo y nunca del modelo; el
consentimiento del cliente manda sobre cualquier envío; fuera de las 24 h de WhatsApp solo salen plantillas
aprobadas; el aviso al equipo no se salta; hay límite de gasto del modelo; no hay rutas HTTP de operación;
las migraciones solo van hacia adelante; y nunca usa claves reales ni la base de producción en pruebas.

---

## 7. Medir la calidad: `pnpm banco`

Las pruebas (`pnpm verify`) garantizan las reglas con un modelo falso. **El banco mide al modelo real**:
corre 23 conversaciones del negocio en la aplicación completa (en memoria, con la semilla y WhatsApp y
Khipu falsos) y deja un informe con lo que leería el cliente.

```bash
pnpm banco
```

```bash
pnpm banco --esfuerzo low,medium,high --casos saludo,recomendacion,cliente-que-vuelve
```

- Gasta tokens de la cuenta de `.env`: una corrida completa en `medium` usa unos 77 mil tokens de entrada y
  8 mil de salida.
- El informe queda en `.banco/<fecha>-<modelo>-<esfuerzo>.md` (fuera de git), con las conversaciones,
  tokens, latencias y fallos verificables: cómo terminó cada turno (respuesta, resumen, pago, traspaso o
  reclamo), lo que debía mencionar, voseo, «bot», SKU, marcadores sin resolver, «$0» y mensajes de más de
  700 caracteres.
- Los casos están en `local/banco/casos-de-venta.ts` y `local/banco/casos-de-atencion.ts`. Un caso nuevo
  es un objeto con el cliente, sus mensajes y lo que se espera.
- **Regla práctica**: todo cambio de reglas, de modelo o de esfuerzo se mide con el banco antes de
  integrarlo, y el resultado va en el PR.

Lo verificable no reemplaza leer: el informe se lee completo para juzgar el tono.

### Resultados de referencia (gpt-6-luna, 21-10-2026)

| Momento | Esfuerzo | Casos sin fallos | Latencia media | Tokens de salida |
|---|---|---|---|---|
| Con los arreglos (#3), antes de la voz nueva | medium | 18 / 22 | 3,7 s | 6.372 |
| Con la voz nueva (#5) | medium | 22 / 22 | 3,8 s | 6.663 |
| Con la memoria del cliente (#7) | medium | 23 / 23 | 4,0 s | 7.651 |

Comparación final por esfuerzo, con todo integrado (23 casos, la misma corrida):

| Esfuerzo | Casos sin fallos | Latencia media | Latencia máxima | Tokens de salida | Qué falló |
|---|---|---|---|---|---|
| `low` | 21 / 23 | 2,0 s | 4,3 s | 2.928 | Al cliente que vuelve le escribió «Futaleufú» pero armó el resumen con **El Prohibido**; y pidió aclarar un cambio de cantidad |
| **`medium`** | **23 / 23** | 4,0 s | 14,9 s | 8.289 | — |
| `high` | 22 / 23 | 4,2 s | 11,6 s | 10.595 | Pidió aclarar el mismo cambio de cantidad (una pregunta razonable, no un error) |

El error de `low` es justo del tipo que más cuesta: el texto dice un café y el pedido es otro. Por eso se
eligió `medium`.

---

## 8. Decisiones tomadas (y por qué)

| Decisión | Por qué | Cómo cambiarla |
|---|---|---|
| **Responses API** de OpenAI por defecto | Con `gpt-6-luna`, `/chat/completions` no acepta razonamiento junto con una función forzada; `/responses` sí | `CAFE_MODELO_API=chat` para proveedores que solo tienen `/chat/completions` (OpenRouter, Groq…) |
| Esfuerzo **`medium`** | Mejor criterio que `low` en casos difíciles; `high` cuesta unas 3,5 veces más en tokens y tarda hasta 12 s extra (encima de los 25 s que se esperan para agrupar), a cambio de poca mejora | `CAFE_MODELO_ESFUERZO` (`none`, `low`, `medium`, `high`), medido con `pnpm banco` |
| `store: false` en OpenAI | Que OpenAI no guarde las conversaciones de los clientes | `src/modelo/adaptadores/formato-responses.ts` |
| No usar OpenCode Go | Está pensado para agentes de programación y vigila el tráfico; un chatbot de ventas queda fuera de su uso | OpenCode Zen sí sirve (pago por uso): `CAFE_MODELO_BASE_URL=https://opencode.ai/zen/v1` y `CAFE_MODELO_API=chat` |
| Notas de cata y FAQ en los **registros duraderos**, no en tablas | Se leen enteras en cada turno y solo cambian con `pnpm cargar`; sin migración nueva | — |
| Memoria del cliente: **notas breves + últimos 3 pedidos** | Lo útil para «lo mismo de la otra vez» sin guardar datos sensibles; los montos no se recuerdan porque cambian | Máximo de notas en `src/clientes/dominio/recuerdo.ts`; pedidos en `src/pedidos/casos-de-uso/pedidos-anteriores.ts` |
| El modelo anota solo, **sin aprobación** del equipo | Funciona desde el primer día; las notas se filtran (sin montos, RUT, teléfonos, correos ni enlaces) y el equipo las ve y las borra | `pnpm bandeja recuerdo <teléfono>` y `olvidar` |
| Las aperturas de traspaso las escribe el modelo, **la promesa el sistema** | «En un ratito» solo se dice si el aviso al equipo salió de verdad (línea roja) | `src/turno/dominio/apertura.ts` |

---

## 9. Riesgos y límites conocidos

- **Datos del negocio vacíos** (sección 5): con todo pendiente, casi toda conversación termina en la
  encargada. Es el bloqueo principal para publicar.
- **El juicio fino lo hace el modelo.** Las reglas y los validadores atajan montos, SKU, enlaces y
  promesas, pero el tono y la elección de opciones dependen del modelo: un cambio de modelo o de versión se
  mide con el banco. Con `low`, el modelo llegó a nombrar un café en el texto y proponer otro en el pedido;
  el cliente lo ve en el resumen antes de confirmar, pero es una razón para no bajar el esfuerzo.
- **Un modelo distinto** puede no soportar la herramienta forzada estricta; si las respuestas salen raras
  o todo pasa a la encargada, vuelve a `gpt-6-luna` (ver `SETUP.md`, punto 9).
- **Notas del cliente**: el filtro descarta los datos sensibles más comunes, pero un modelo podría anotar
  algo inapropiado con otras palabras. Revísalas con `pnpm bandeja recuerdo` las primeras semanas.
- **Ventana de 24 h de WhatsApp**: sin las plantillas aprobadas, el aviso de pago y el aviso al equipo
  fuera de esa ventana no salen.
- **Audios e imágenes**: el chatbot no los interpreta; pide que le escriban (las fotos de un reclamo quedan
  para el equipo).

---

## 10. Ideas para lo que sigue

Ordenadas por impacto, ninguna empezada:

1. Cargar precios, zonas, FAQ y notas de cata, y correr el banco con los datos reales.
2. Agregar al banco los casos que aparezcan en las primeras semanas de uso real (cada traspaso que no debió
   ser traspaso es un caso nuevo).
3. Que la encargada pueda ver los pedidos del cliente en `pnpm bandeja ver`.
4. Avisos de recompra con plantilla aprobada, respetando el consentimiento y la política de contacto.
5. Transcribir audios para que el chatbot los entienda.

---

## Glosario

| Término | Qué es |
|---|---|
| **Tramo** | Minorista o mayorista: decide qué precio ve el cliente |
| **Familia** | Un café (Futaleufú); sus **formatos** (SKU) son las bolsas que se venden (150 g molido…) |
| **Marcador** | Lo que escribe el modelo en lugar de un monto (`{{precio:0028}}`); el sistema pone el número |
| **Traspaso** | Pasarle la conversación a una persona: aviso al equipo + conversación pausada |
| **Bandeja** | Las conversaciones, que el equipo atiende con `pnpm bandeja` |
| **Turno** | Una respuesta del chatbot a un lote de mensajes del cliente |
| **Doble** | Un reemplazo falso de WhatsApp, Khipu o el modelo para probar sin salir a internet |
| **Banco** | Las conversaciones de referencia contra el modelo real (`pnpm banco`) |
| **Registros duraderos** | Documentos JSON en PostgreSQL (`cafe.registros`) para lo que no merece tabla |
