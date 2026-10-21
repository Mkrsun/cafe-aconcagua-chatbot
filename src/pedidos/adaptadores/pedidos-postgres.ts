import type pg from "pg";
import { Conflicto } from "../../plataforma/errores.js";
import type {
  EstadoDelPedido,
  PagoDelPedido,
  Pedido,
  VersionDelPedido,
} from "../dominio/pedido.js";
import type { IPedidos } from "../puertos/pedidos.js";

const GUARDAR_PEDIDO = `
  INSERT INTO cafe.pedidos (id, cliente_id, estado, creado_en, actualizado_en, datos)
  VALUES ($1, $2, $3, $4, $5, $6::jsonb)
  ON CONFLICT (id) DO UPDATE SET cliente_id = EXCLUDED.cliente_id,
    estado = EXCLUDED.estado, actualizado_en = EXCLUDED.actualizado_en, datos = EXCLUDED.datos`;

const GUARDAR_VERSION = `
  INSERT INTO cafe.versiones_de_pedidos (id, pedido_id, version, creada_en, datos)
  VALUES ($1, $2, $3, $4, $5::jsonb)`;

const GUARDAR_PAGO = `
  INSERT INTO cafe.pagos (id, pedido_id, id_en_khipu, estado, datos)
  VALUES ($1, $2, $3, $4, $5::jsonb)
  ON CONFLICT (id) DO UPDATE SET pedido_id = EXCLUDED.pedido_id,
    id_en_khipu = EXCLUDED.id_en_khipu, estado = EXCLUDED.estado,
    actualizado_en = now(), datos = EXCLUDED.datos`;

const VIOLACION_DE_UNICIDAD = "23505";

/** Pedidos, versiones y pagos: el documento en `datos`; columnas aparte solo para buscar. */
export class PedidosPostgres implements IPedidos {
  constructor(private readonly pool: pg.Pool) {}

  async guardarPedido(p: Pedido) {
    await this.pool.query(GUARDAR_PEDIDO, [
      p.id,
      p.clienteId,
      p.estado,
      p.creadoEn,
      p.actualizadoEn,
      JSON.stringify(p),
    ]);
  }

  async guardarVersion(v: VersionDelPedido) {
    try {
      await this.pool.query(GUARDAR_VERSION, [
        v.id,
        v.pedidoId,
        v.version,
        v.creadaEn,
        JSON.stringify(v),
      ]);
    } catch (error) {
      if ((error as { code?: string }).code === VIOLACION_DE_UNICIDAD)
        throw new Conflicto("version-existe");
      throw error;
    }
  }

  async obtener(id: string) {
    const [pedido] = await this.datos<Pedido>(
      "SELECT datos FROM cafe.pedidos WHERE id = $1",
      [id],
    );
    if (!pedido) return undefined;
    const [version] = await this.datos<VersionDelPedido>(
      "SELECT datos FROM cafe.versiones_de_pedidos WHERE id = $1",
      [pedido.versionVigenteId],
    );
    return { pedido, ...(version ? { version } : {}) };
  }

  async listar(filtro: { clienteId?: string; estado?: EstadoDelPedido }) {
    return this.datos<Pedido>(
      `SELECT datos FROM cafe.pedidos
       WHERE ($1::text IS NULL OR cliente_id = $1)
         AND ($2::text IS NULL OR estado = $2)
       ORDER BY creado_en DESC, id`,
      [filtro.clienteId ?? null, filtro.estado ?? null],
    );
  }

  async guardarPago(p: PagoDelPedido) {
    await this.pool.query(GUARDAR_PAGO, [
      p.id,
      p.pedidoId,
      p.idEnKhipu,
      p.estado,
      JSON.stringify(p),
    ]);
  }

  async pagosDe(pedidoId: string) {
    return this.datos<PagoDelPedido>(
      `SELECT datos FROM cafe.pagos WHERE pedido_id = $1
       ORDER BY datos->>'creadoEn', id`,
      [pedidoId],
    );
  }

  async pagoPorReferencia(idEnKhipu: string) {
    const [pago] = await this.datos<PagoDelPedido>(
      `SELECT datos FROM cafe.pagos WHERE id_en_khipu = $1
       ORDER BY datos->>'creadoEn', id LIMIT 1`,
      [idEnKhipu],
    );
    return pago;
  }

  private async datos<D>(sql: string, valores: unknown[]): Promise<D[]> {
    const { rows } = await this.pool.query<{ datos: D }>(sql, valores);
    return rows.map((r) => r.datos);
  }
}
