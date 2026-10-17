import { createServer } from "node:net";

/**
 * Falla si el puerto ya tiene dueño. Se revisa antes de arrancar: si no, la espera de `/salud`
 * podría contestarla otro `pnpm local` que siga abierto.
 */
export function exigirPuertoLibre(
  puerto: number,
  variable: string,
): Promise<void> {
  return new Promise((listo, fallo) => {
    const prueba = createServer();
    prueba.once("error", () =>
      fallo(
        new Error(
          `El puerto ${puerto} está ocupado (¿quedó abierto otro pnpm local?). Ciérralo o ` +
            `elige otro con ${variable} en .env.`,
        ),
      ),
    );
    prueba.listen(puerto, () => prueba.close(() => listo()));
  });
}
