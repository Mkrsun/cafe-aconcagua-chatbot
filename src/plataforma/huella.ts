import { createHash } from "node:crypto";

/** JSON con las claves ordenadas: el mismo contenido da el mismo texto. */
const jsonEstable = (valor: unknown): string =>
  JSON.stringify(valor, (_clave, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        )
      : v,
  );

/** Una revisión por contenido (control optimista): cambia si y solo si cambia el contenido. */
export const huellaDe = (valor: unknown): string =>
  createHash("sha256").update(jsonEstable(valor)).digest("hex").slice(0, 16);
