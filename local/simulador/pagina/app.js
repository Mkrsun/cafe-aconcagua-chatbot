// El simulador en el navegador: pregunta el estado cada poco y dibuja solo lo que cambió.
const REVISAR_CADA_MS = 800;
const $ = (id) => document.getElementById(id);
const hora = (iso) =>
  new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
const dolares = (usd) => `US$${usd.toFixed(4)}`;
const ESTADOS = {
  abierta: "La atiende el chatbot",
  pausada: "Espera a una persona",
  asignada: "La lleva el equipo",
};
const ESPERA = {
  esperando: "El chatbot espera a que termines de escribir…",
  escribiendo: "El chatbot está escribiendo…",
  libre: "",
};

let telefono = "";
const dibujado = { hilo: "", bandeja: "", avisos: "", gasto: "" };

async function api(ruta, cuerpo) {
  const r = await fetch(`/simulador/api/${ruta}`, {
    method: cuerpo ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const datos = await r.json();
  if (!r.ok) throw new Error(datos.error ?? `error ${r.status}`);
  return datos;
}

const elemento = (tag, props = {}, ...hijos) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...hijos.filter((h) => h !== undefined && h !== null));
  return e;
};

function mostrarError(id, error) {
  $(id).textContent = error ? error.message : "";
}

async function mandar(pedido) {
  try {
    await api("mensaje", { telefono, ...pedido });
    mostrarError("error-chat");
    await revisar();
  } catch (e) {
    mostrarError("error-chat", e);
  }
}

function burbuja(m) {
  const li = elemento("li", { className: `burbuja burbuja--${m.de}` }, m.texto);
  if (m.opciones.length) {
    const opciones = elemento("div", { className: "opciones" });
    for (const o of m.opciones)
      opciones.append(
        elemento(
          "button",
          {
            type: "button",
            onclick: () => mandar({ tipo: "eleccion", opcion: o }),
          },
          o.titulo,
          o.descripcion ? elemento("small", {}, o.descripcion) : undefined,
        ),
      );
    li.append(opciones);
  }
  if (m.enlace)
    li.append(
      elemento("br"),
      elemento(
        "span",
        { className: "enlace", title: m.enlace.url },
        `🔗 ${m.enlace.texto} (usa «Simular pago»)`,
      ),
    );
  if (m.pideUbicacion)
    li.append(elemento("br"), "📍 Usa «Compartir ubicación».");
  li.append(elemento("time", { dateTime: m.en }, hora(m.en)));
  return li;
}

function dibujarHilo(estado) {
  const clave = JSON.stringify(estado.mensajes);
  if (clave !== dibujado.hilo) {
    dibujado.hilo = clave;
    const hilo = $("hilo");
    hilo.replaceChildren(...estado.mensajes.map(burbuja));
    hilo.scrollTop = hilo.scrollHeight;
  }
  $("estado-chat").textContent = ESPERA[estado.estado];
}

async function enBandeja(args) {
  const resultado = $("resultado-bandeja");
  try {
    const { lineas } = await api("bandeja", { args });
    resultado.className = "resultado";
    resultado.textContent = lineas.join(" ");
    await revisar();
  } catch (e) {
    resultado.className = "resultado error";
    resultado.textContent = e.message;
  }
}

function conversacion(c) {
  const como = () => $("como").value.trim();
  const respuesta = elemento("input", {
    placeholder: `Responder a ${c.nombre}`,
  });
  respuesta.dataset.id = c.id;
  respuesta.setAttribute("aria-label", `Respuesta para ${c.nombre}`);
  const boton = (texto, args, secundario = true) =>
    elemento(
      "button",
      {
        type: "button",
        className: secundario ? "secundario" : "",
        onclick: () => enBandeja(args()),
      },
      texto,
    );
  const responder = boton(
    "Responder",
    () => ["responder", c.id, "--como", como(), respuesta.value],
    false,
  );
  respuesta.addEventListener(
    "keydown",
    (e) => e.key === "Enter" && responder.click(),
  );
  return elemento(
    "li",
    {
      className: `conversacion ${c.estado === "abierta" ? "" : "conversacion--espera"}`,
    },
    elemento(
      "p",
      {},
      elemento("strong", {}, c.nombre),
      ` (${c.telefono})`,
      elemento(
        "span",
        { className: "insignia" },
        ESTADOS[c.estado] ?? c.estado,
      ),
    ),
    c.propietario ? elemento("p", {}, `La lleva ${c.propietario}`) : undefined,
    c.motivo ? elemento("p", {}, `Motivo: ${c.motivo}`) : undefined,
    c.resumen ? elemento("p", {}, `Resumen: ${c.resumen}`) : undefined,
    elemento(
      "div",
      { className: "acciones" },
      respuesta,
      responder,
      boton("Tomar", () => ["tomar", c.id, "--como", como()]),
      boton("Pausar", () => ["pausar", c.id, "--como", como()]),
      boton("Quitar pausa", () => ["reanudar", c.id]),
      boton("Resolver (vuelve el chatbot)", () => ["resolver", c.id]),
    ),
  );
}

/** Al redibujar la bandeja se conserva lo que el equipo estaba escribiendo. */
function dibujarBandeja(lista) {
  const clave = JSON.stringify(lista);
  if (clave === dibujado.bandeja) return;
  const escritos = new Map(
    [...$("bandeja").querySelectorAll("input")].map((i) => [
      i.dataset.id,
      i.value,
    ]),
  );
  const foco = document.activeElement?.dataset?.id;
  $("bandeja").replaceChildren(
    ...(lista.length
      ? lista.map(conversacion)
      : [
          elemento(
            "li",
            { className: "vacio" },
            "No hay conversaciones abiertas.",
          ),
        ]),
  );
  for (const i of $("bandeja").querySelectorAll("input")) {
    i.value = escritos.get(i.dataset.id) ?? "";
    if (i.dataset.id === foco) i.focus();
  }
  dibujado.bandeja = clave;
}

function dibujarAvisos(avisos) {
  const clave = JSON.stringify(avisos);
  if (clave === dibujado.avisos) return;
  dibujado.avisos = clave;
  $("avisos").replaceChildren(
    ...(avisos.length
      ? avisos.map((a) => elemento("li", {}, `${hora(a.en)} · ${a.texto}`))
      : [elemento("li", { className: "vacio" }, "Ningún aviso todavía.")]),
  );
}

function dibujarGasto(g) {
  const clave = JSON.stringify(g);
  if (clave === dibujado.gasto) return;
  dibujado.gasto = clave;
  const fila = (t, d) => [elemento("dt", {}, t), elemento("dd", {}, d)];
  $("gasto").replaceChildren(
    ...fila("Llamadas al modelo", String(g.llamadas)),
    ...fila(
      "Tokens de entrada",
      `${g.inputTokens} (cacheados: ${g.cachedInputTokens})`,
    ),
    ...fila("Tokens de salida", String(g.outputTokens)),
    ...fila(
      "Gasto",
      g.conTarifa
        ? `${dolares(g.usd)} de US$${g.limiteUSD} al mes`
        : "Sin tarifa configurada",
    ),
  );
}

async function revisar() {
  if (!telefono) return;
  try {
    const estado = await api(`estado?telefono=${telefono}`);
    dibujarHilo(estado);
    dibujarBandeja(estado.bandeja);
    dibujarAvisos(estado.avisos);
    dibujarGasto(estado.gasto);
  } catch (e) {
    $("estado-chat").textContent =
      `Sin conexión con pnpm local (${e.message}).`;
  }
}

async function empezar() {
  const clientes = await api("clientes");
  $("cliente").replaceChildren(
    ...clientes.map((c) =>
      elemento("option", { value: c.telefono }, `${c.nombre} (${c.tramo})`),
    ),
  );
  telefono = clientes[0]?.telefono ?? "";
  $("cliente").addEventListener("change", (e) => {
    telefono = e.target.value;
    dibujado.hilo = "";
    revisar();
  });
  $("escribir").addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = $("mensaje").value;
    $("mensaje").value = "";
    if (texto.trim()) mandar({ tipo: "texto", texto });
  });
  $("mensaje").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("escribir").requestSubmit();
    }
  });
  $("ubicacion").addEventListener("click", () => mandar({ tipo: "ubicacion" }));
  $("pagar").addEventListener("click", async () => {
    try {
      await api("pagar", {});
      mostrarError("error-chat");
      await revisar();
    } catch (e) {
      mostrarError("error-chat", e);
    }
  });
  await revisar();
  setInterval(revisar, REVISAR_CADA_MS);
}

empezar();
