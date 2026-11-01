// Marca alguns ninhos como misteriosos ("?" até chegarem na frente), só visual. Idempotente.
// Uso: node scripts/misterios.mjs   (rode depois de gerar as fases)
import { readFileSync, writeFileSync } from 'node:fs';

const alvos = [
  [new URL('../src/fases/fases.json', import.meta.url), 6, 0.09],
  [new URL('../src/fases/fase-teste.json', import.meta.url), 0, 0.2],
];
const sorteio = (a, b, c) => {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
for (const [arq, desde, taxa] of alvos) {
  const lido = JSON.parse(readFileSync(arq, 'utf8'));
  const lista = Array.isArray(lido) ? lido : [lido];
  let total = 0;
  for (const f of lista) {
    f.grade.forEach((linha, l) =>
      linha.forEach((n, c) => {
        if (!n) return;
        delete n.m;
        // só atrás da frente, sem cano, e nunca em fases iniciais
        if (f.id >= desde && l >= 1 && n.g === undefined && sorteio(f.id, l, c) < taxa) {
          n.m = true;
          total++;
        }
      }),
    );
  }
  writeFileSync(arq, JSON.stringify(lido));
  console.log(arq.pathname.split('/').pop(), 'ninhos misteriosos:', total);
}
