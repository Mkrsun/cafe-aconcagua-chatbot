/**
 * El reloj es un borde: todo lo que depende de la hora lo recibe, así las
 * pruebas fijan el tiempo. Real: `relojDelSistema` · fake: `RelojFalso`.
 */
export type Reloj = () => Date;

export const relojDelSistema: Reloj = () => new Date();
