/**
 * Gera src/fases/fases.json. Uso: node scripts/gerar.ts [primeira] [ultima]
 * (sem argumentos: todas as fases que estão em scripts/lista-fases.ts)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gerarFase } from './gerador.ts';
import { entradas } from './lista-fases.ts';
import type { Fase } from '../src/motor/tipos.ts';

const de = Number(process.argv[2] ?? 1);
const ate = Number(process.argv[3] ?? 60);
const arquivo = new URL('../src/fases/fases.json', import.meta.url);
const atuais: Fase[] = existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : [];
const porId = new Map(atuais.map((f) => [f.id, f]));
const faixas: string[] = [];
for (const ent of entradas()) {
  if (ent.id < de || ent.id > ate) continue;
  const t0 = Date.now();
  const r = gerarFase(ent);
  porId.set(ent.id, r.fase);
  const linha = `fase ${String(ent.id).padStart(2)} ${ent.nome.padEnd(14)} ${r.fase.largura}x${r.fase.altura} taxa=${r.fase.taxaAleatoria} ${r.naFaixa ? 'ok' : 'FORA DA FAIXA'} tent=${r.tentativas} formigas=${r.fase.colunas.flat().length} ${((Date.now() - t0) / 1000).toFixed(1)}s`;
  console.log(linha);
  if (!r.naFaixa) faixas.push(linha);
  writeFileSync(arquivo, JSON.stringify([...porId.values()].sort((a, b) => a.id - b.id)));
}
if (faixas.length) console.log('\nFora da faixa:\n' + faixas.join('\n'));
