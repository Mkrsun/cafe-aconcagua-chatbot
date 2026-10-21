import pg from "pg";
import { crearAlmacenes } from "../../launcher/composicion/almacenes.js";
import { BaseDeFaq } from "../../src/faq/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { describirConPostgres } from "../../src/plataforma/test-support/base-de-pruebas.js";
import { CLIENTES_DE_EJEMPLO } from "../clientes-de-ejemplo.js";
import { basePropia, borrarBasePropia } from "../test-support/base-propia.js";
import { PRECIOS, PREGUNTAS, ZONAS } from "./datos.js";
import { ejecutarSemilla } from "./ejecutar.js";

describe("la semilla se niega fuera de una base de desarrollo", () => {
  const dev = "postgresql://cafe:cafe@127.0.0.1:5433/cafe_dev";

  it("sin DATABASE_URL dice qué falta", async () => {
    await expect(ejecutarSemilla({})).rejects.toThrow(/DATABASE_URL/);
  });

  it("una base en otro servidor no es de desarrollo", async () => {
    await expect(
      ejecutarSemilla({
        DATABASE_URL: "postgresql://cafe@db.cafeaconcagua.cl:5432/cafe_dev",
      }),
    ).rejects.toThrow(/no es local/);
  });

  it("una base local sin nombre de desarrollo tampoco", async () => {
    await expect(
      ejecutarSemilla({
        DATABASE_URL: "postgresql://cafe@127.0.0.1:5433/cafe",
      }),
    ).rejects.toThrow(/cafe_dev/);
  });

  it("con CAFE_ENV=produccion no corre", async () => {
    await expect(
      ejecutarSemilla({ DATABASE_URL: dev, CAFE_ENV: "produccion" }),
    ).rejects.toThrow(/producción/);
  });
});

const SKUS = PRECIOS.map((p) => p.sku);

/** Lo que la semilla deja, leído de los almacenes como lo vería el equipo. */
async function foto(pool: pg.Pool) {
  const a = crearAlmacenes(pool);
  const precios = (await a.catalogo.listar())
    .filter((f) => SKUS.includes(f.sku))
    .flatMap((f) => f.precios);
  const tarifas = await a.tarifas.listar();
  const clientes = await a.clientes.listar();
  const politicas = [];
  for (const c of clientes) politicas.push(await a.politicas.de(c.id));
  const entradas = await new BaseDeFaq(a.registros, () => new Date()).listar();
  return { precios, tarifas, clientes, politicas, entradas };
}

describirConPostgres("la semilla en una base de desarrollo", () => {
  let url: string;
  let pool: pg.Pool;

  beforeAll(async () => {
    url = await basePropia("semilla");
    await ejecutarSemilla({ DATABASE_URL: url });
    pool = new pg.Pool({ connectionString: url, max: 2 });
  }, 30_000);

  afterAll(async () => {
    await pool?.end();
    if (url) await borrarBasePropia(url);
  });

  it("carga precios, zonas, clientes con consentimiento y FAQ publicadas", async () => {
    const { precios, tarifas, clientes, politicas, entradas } =
      await foto(pool);
    for (const p of PRECIOS)
      for (const tramo of ["minorista", "mayorista"] as const)
        expect(precios).toContainEqual(
          expect.objectContaining({
            sku: p.sku,
            tramo,
            estado: "configurado",
            montoClp: p[tramo],
          }),
        );
    expect(tarifas.map((t) => t.zona).sort()).toEqual(
      ZONAS.map((z) => z.zona).sort(),
    );
    expect(
      clientes.map((c) => ({ telefono: c.telefonos[0], tramo: c.tramo })),
    ).toEqual(
      expect.arrayContaining(
        Object.values(CLIENTES_DE_EJEMPLO).map((c) => ({
          telefono: c.telefono,
          tramo: c.tramo,
        })),
      ),
    );
    expect(clientes).toHaveLength(2);
    for (const p of politicas)
      expect(p).toMatchObject({
        consentimiento: "otorgado",
        whatsapp: "otorgado",
      });
    expect(entradas).toHaveLength(PREGUNTAS.length);
    for (const e of entradas) expect(e.estado).toBe("publicada");
  });

  it("es idempotente: la segunda corrida no cambia nada", async () => {
    const antes = await foto(pool);
    const resumen = await ejecutarSemilla({ DATABASE_URL: url });
    expect(resumen.cambios).toEqual([]);
    expect(resumen.sinCambios.length).toBeGreaterThan(0);
    expect(await foto(pool)).toEqual(antes);
  });

  it("deja la base igual a las definiciones: un precio cambiado a mano vuelve", async () => {
    const { catalogo } = crearAlmacenes(pool);
    const formato = (await catalogo.listar()).find((f) => f.sku === "0028")!;
    await catalogo.fijarPrecio(
      "0028",
      "minorista",
      10990,
      formato.precios[0]!.revision,
      "a mano",
    );
    const resumen = await ejecutarSemilla({ DATABASE_URL: url });
    expect(resumen.cambios).toEqual(["precio minorista de 0028: $9.990"]);
  });
});
