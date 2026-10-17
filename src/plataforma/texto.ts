/**
 * Un texto para comparar como lo haría una persona: sin tildes, sin mayúsculas, sin signos y con un
 * solo espacio entre palabras («Ñuñoa,  ¡ALTO!» ≡ «nunoa alto»).
 */
export const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
