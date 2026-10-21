import type pg from "pg";
import { Conflicto } from "../../plataforma/errores.js";
import { enTransaccion } from "../../plataforma/postgres/transaccion.js";
import { normalizarTelefono } from "../../plataforma/telefono.js";
import type { Tramo } from "../../catalogo/dominio/tramos.js";
import type { Cliente } from "../dominio/cliente.js";
import { calzaConBusqueda } from "../dominio/busqueda.js";
import type { IClientes } from "../puertos/clientes.js";

const SELECT = `
  SELECT c.id, c.nombre, c.tipo, c.tramo, c.estado, c.creado_en, c.actualizado_en,
    COALESCE(array_agg(t.telefono ORDER BY t.telefono) FILTER (WHERE t.telefono IS NOT NULL),
      '{}') AS telefonos
  FROM cafe.clientes c
  LEFT JOIN cafe.telefonos_de_clientes t ON t.cliente_id = c.id`;
const AGRUPAR = "GROUP BY c.id";
const GUARDAR = `
  INSERT INTO cafe.clientes (id, nombre, tipo, tramo, estado, creado_en, actualizado_en)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo,
    tramo = EXCLUDED.tramo, estado = EXCLUDED.estado, actualizado_en = EXCLUDED.actualizado_en`;

interface Fila {
  id: string;
  nombre: string;
  tipo: Cliente["tipo"];
  tramo: Tramo;
  estado: Cliente["estado"];
  creado_en: Date;
  actualizado_en: Date;
  telefonos: string[];
}

const desdeFila = (f: Fila): Cliente => ({
  id: f.id,
  nombre: f.nombre,
  tipo: f.tipo,
  tramo: f.tramo,
  estado: f.estado,
  telefonos: f.telefonos,
  creadoEn: f.creado_en.toISOString(),
  actualizadoEn: f.actualizado_en.toISOString(),
});

/** Los clientes en `cafe.clientes`, con sus teléfonos en `cafe.telefonos_de_clientes`. */
export class ClientesPostgres implements IClientes {
  constructor(private readonly pool: pg.Pool) {}

  async porId(id: string) {
    const { rows } = await this.pool.query<Fila>(
      `${SELECT} WHERE c.id = $1 ${AGRUPAR}`,
      [id],
    );
    return rows[0] && desdeFila(rows[0]);
  }

  async porTelefono(telefono: string) {
    const { rows } = await this.pool.query<Fila>(
      `${SELECT} WHERE c.id = (SELECT x.cliente_id FROM cafe.telefonos_de_clientes x
         WHERE x.telefono = $1) ${AGRUPAR}`,
      [normalizarTelefono(telefono)],
    );
    return rows[0] && desdeFila(rows[0]);
  }

  async listar(busqueda?: string) {
    const { rows } = await this.pool.query<Fila>(
      `${SELECT} ${AGRUPAR} ORDER BY c.creado_en, c.id`,
    );
    return rows.map(desdeFila).filter((c) => calzaConBusqueda(c, busqueda));
  }

  async guardar(cliente: Cliente) {
    try {
      await enTransaccion(this.pool, async (db) => {
        await db.query(GUARDAR, [
          cliente.id,
          cliente.nombre,
          cliente.tipo,
          cliente.tramo,
          cliente.estado,
          cliente.creadoEn,
          cliente.actualizadoEn,
        ]);
        await db.query(
          "DELETE FROM cafe.telefonos_de_clientes WHERE cliente_id = $1",
          [cliente.id],
        );
        for (const telefono of cliente.telefonos)
          await db.query(
            `INSERT INTO cafe.telefonos_de_clientes (telefono, cliente_id) VALUES ($1, $2)`,
            [telefono, cliente.id],
          );
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new Conflicto("telefono-repetido");
      throw error;
    }
  }
}
