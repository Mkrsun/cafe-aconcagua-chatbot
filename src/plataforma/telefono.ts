/** Solo los dígitos de un teléfono (como lo escribe Graph). */
export const soloDigitos = (telefono: string): string =>
  telefono.replace(/\D/g, "");

/**
 * El teléfono como se guarda: dígitos con código de país. Un celular chileno sin código (9 dígitos
 * que empiezan en 9) recibe el 56.
 */
export function normalizarTelefono(telefono: string): string {
  const digitos = soloDigitos(telefono);
  return /^9\d{8}$/.test(digitos) ? `56${digitos}` : digitos;
}
