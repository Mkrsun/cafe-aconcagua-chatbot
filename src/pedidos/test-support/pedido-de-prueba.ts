import type { PedidoNuevo } from "../dominio/pedido.js";

/** Un pedido confirmado por WhatsApp: 2 Futaleufú a $9.990 + despacho $3.990. */
export const pedidoDePrueba = (
  cambios: Partial<PedidoNuevo> = {},
): PedidoNuevo => ({
  id: "ped_1",
  clienteId: "cli_1",
  conversacionId: "conv_1",
  lineas: [
    {
      sku: "0025",
      nombreInterno: "Futaleufú — 150 gramos / Grano entero",
      cantidad: 2,
      gramaje: "150g",
      precioUnitario: 9990,
      subtotal: 19980,
    },
  ],
  total: 23970,
  notas: "Despacho a Ñuñoa (Santiago oriente): $3.990",
  ...cambios,
});
