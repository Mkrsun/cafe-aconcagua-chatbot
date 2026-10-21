import { ejecutarSemilla } from "./ejecutar.js";

try {
  const { cambios, sinCambios } = await ejecutarSemilla(process.env);
  for (const cambio of cambios) console.log(`  + ${cambio}`);
  console.log(
    `Semilla lista: ${cambios.length} cambios, ${sinCambios.length} cosas ya estaban.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
