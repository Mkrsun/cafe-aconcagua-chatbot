import { DatosInvalidos } from "../../plataforma/errores.js";
import { normalizarTelefono } from "../../plataforma/telefono.js";
import { esTramo, type Tramo } from "../../catalogo/dominio/tramos.js";

/** Los tipos de cliente reales de Café (los mismos que admite `cafe.clientes`). */
export const TIPOS_DE_CLIENTE = [
  "mayorista-tienda",
  "mayorista-local",
  "minorista",
  "horeca",
] as const;
export type TipoDeCliente = (typeof TIPOS_DE_CLIENTE)[number];
export const ESTADOS_DE_CLIENTE = ["activo", "inactivo", "perdido"] as const;
export type EstadoDeCliente = (typeof ESTADOS_DE_CLIENTE)[number];

export interface Cliente {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoDeCliente;
  /** El tramo de precios de su ficha. */
  readonly tramo: Tramo;
  readonly estado: EstadoDeCliente;
  /** Teléfonos de WhatsApp normalizados (dígitos con código de país). */
  readonly telefonos: readonly string[];
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

export type DatosDeCliente = Pick<
  Cliente,
  "nombre" | "tipo" | "tramo" | "telefonos"
>;
export type CambiosDeCliente = Partial<
  DatosDeCliente & Pick<Cliente, "estado">
>;

const nombre = (v: unknown) => {
  const t = typeof v === "string" ? v.trim() : "";
  if (t.length < 2 || t.length > 120)
    throw new DatosInvalidos("nombre debe tener entre 2 y 120 caracteres");
  return t;
};

function uno<T extends string>(
  v: unknown,
  opciones: readonly T[],
  campo: string,
): T {
  if (!opciones.includes(v as T))
    throw new DatosInvalidos(
      `${campo} debe ser uno de: ${opciones.join(", ")}`,
    );
  return v as T;
}

const tramo = (v: unknown): Tramo => {
  if (!esTramo(v))
    throw new DatosInvalidos("tramo debe ser minorista o mayorista");
  return v;
};

function telefonos(v: unknown): readonly string[] {
  if (!Array.isArray(v) || v.length > 5)
    throw new DatosInvalidos("telefonos debe ser una lista de hasta 5");
  return [
    ...new Set(
      v.map((t) => {
        const canon = typeof t === "string" ? normalizarTelefono(t) : "";
        if (canon.length < 8 || canon.length > 15)
          throw new DatosInvalidos(`teléfono inválido: ${String(t)}`);
        return canon;
      }),
    ),
  ];
}

/** Los datos de un cliente nuevo, limpios y válidos. */
export function validarClienteNuevo(
  crudo: Record<string, unknown>,
): DatosDeCliente {
  return {
    nombre: nombre(crudo.nombre),
    tipo: uno(crudo.tipo, TIPOS_DE_CLIENTE, "tipo"),
    tramo: tramo(crudo.tramo),
    telefonos: telefonos(crudo.telefonos ?? []),
  };
}

/** Lo que cambia de un cliente; lo que no viene se conserva. */
export function validarCambiosDeCliente(
  crudo: Record<string, unknown>,
): CambiosDeCliente {
  return {
    ...(crudo.nombre !== undefined ? { nombre: nombre(crudo.nombre) } : {}),
    ...(crudo.tipo !== undefined
      ? { tipo: uno(crudo.tipo, TIPOS_DE_CLIENTE, "tipo") }
      : {}),
    ...(crudo.tramo !== undefined ? { tramo: tramo(crudo.tramo) } : {}),
    ...(crudo.telefonos !== undefined
      ? { telefonos: telefonos(crudo.telefonos) }
      : {}),
    ...(crudo.estado !== undefined
      ? { estado: uno(crudo.estado, ESTADOS_DE_CLIENTE, "estado") }
      : {}),
  };
}
