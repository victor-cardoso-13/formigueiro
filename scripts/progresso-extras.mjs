// Mostra quantas fases extra já foram geradas, por nível. Uso: node scripts/progresso-extras.mjs
import { existsSync, readFileSync } from 'node:fs';
const arq = new URL('../src/fases/fases-extra.json', import.meta.url);
const fases = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8') || '[]') : [];
const meta = { facil: 40, medio: 40, dificil: 180, desafio: 170 };
const por = {};
for (const f of fases) por[f.grupo] = (por[f.grupo] ?? 0) + 1;
let total = 0;
for (const [g, m] of Object.entries(meta)) { console.log(g.padEnd(8), `${por[g] ?? 0}/${m}`); total += por[g] ?? 0; }
console.log('total   ', `${total}/430`);
const fora = fases.filter((f) => f.taxaAleatoria === undefined).length;
if (fora) console.log('sem taxa:', fora);
