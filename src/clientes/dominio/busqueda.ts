import { normalizar } from "../../plataforma/texto.js";
import { normalizarTelefono, soloDigitos } from "../../plataforma/telefono.js";
import type { Cliente } from "./cliente.js";

/** Si el cliente calza con lo que escribió el equipo: por nombre o por parte del teléfono. */
export function calzaConBusqueda(cliente: Cliente, busqueda?: string): boolean {
  const texto = normalizar(busqueda ?? "");
  if (!texto) return true;
  const digitos = soloDigitos(texto);
  return (
    normalizar(cliente.nombre).includes(texto) ||
    (digitos.length >= 3 && cliente.telefonos.some((t) => t.includes(digitos)))
  );
}

/** Si el cliente tiene ese teléfono, escrito en cualquier formato. */
export const tieneTelefono = (cliente: Cliente, telefono: string) =>
  cliente.telefonos.includes(normalizarTelefono(telefono));
