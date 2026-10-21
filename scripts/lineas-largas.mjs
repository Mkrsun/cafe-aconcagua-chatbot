// Ninguna línea de TypeScript pasa de 100 caracteres (CLAUDE.md, regla 6). Prettier corta el código a
// 80, pero no los comentarios ni los textos largos: esta revisión los cubre.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const LIMITE = 100;
const CARPETAS = ["src", "launcher", "local", "definiciones", "e2e"];
const esTypeScript = (ruta) => /\.tsx?$/.test(ruta);
const archivos = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "node_modules" ? [] : archivos(ruta);
    return esTypeScript(ruta) ? [ruta] : [];
  });

const largas = CARPETAS.filter((dir) => existsSync(dir))
  .flatMap(archivos)
  .flatMap((ruta) =>
    readFileSync(ruta, "utf8")
      .split("\n")
      .map((linea, i) => ({ ruta, n: i + 1, largo: [...linea].length }))
      .filter((l) => l.largo > LIMITE),
  );
for (const l of largas) console.error(`${l.ruta}:${l.n} tiene ${l.largo} caracteres`);
process.exit(largas.length ? 1 : 0);
