/**
 * Gera src/fases/fases.json. Uso:
 *   node scripts/gerar.ts [primeira] [ultima]        gera (ou refaz) as fases do intervalo (padrão: 1 a 60)
 *   node scripts/gerar.ts medir [primeira] [ultima]  mede de novo a taxa do robô (200 partidas) e grava
 *   node scripts/gerar.ts tabela                     reescreve o FASES.md a partir do fases.json
 * Fases fora do intervalo ficam como estão. Vários processos podem gerar intervalos diferentes ao mesmo tempo.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { FAIXA, distanciaDaFaixa, gerarFase, taxaAleatoria } from './gerador.ts';
import { entradas as entradasBase } from './lista-fases.ts';
import { entradasExtra } from './lista-extra.ts';
import type { Fase } from '../src/motor/tipos.ts';

// FASES_EXTRA=1: gera as fases extra (ids 71…) em src/fases/fases-extra.json, sem mexer no fases.json que está no jogo
const extra = !!process.env.FASES_EXTRA;
const entradas = extra ? entradasExtra : entradasBase;
const arquivo = new URL(extra ? '../src/fases/fases-extra.json' : '../src/fases/fases.json', import.meta.url);

/** Grava no fases.json (com trava, porque vários processos podem gravar ao mesmo tempo). */
function gravar(f: Fase) {
  const trava = new URL('../src/fases/.trava', import.meta.url);
  for (;;) {
    try {
      mkdirSync(trava);
      break;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  const atuais: Fase[] = existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8') || '[]') : [];
  const porId = new Map(atuais.filter((x) => Array.isArray(x.grade)).map((x) => [x.id, x]));
  porId.set(f.id, f);
  writeFileSync(arquivo, JSON.stringify([...porId.values()].sort((a, b) => a.id - b.id)));
  rmdirSync(trava);
}

/** Reescreve o FASES.md. */
function tabela() {
  const fases: Fase[] = JSON.parse(readFileSync(arquivo, 'utf8'));
  const linhas = ['| id | grupo | nome | tamanho | cores | colunas | ninhos | canos | taxa | faixa |', '|---|---|---|---|---|---|---|---|---|---|'];
  const fora: string[] = [];
  const porGrupo: Record<string, number[]> = {};
  for (const f of fases) {
    const ninhos = f.grade.flat().filter(Boolean).length;
    const canos = new Set(f.grade.flat().filter((n) => n?.g !== undefined).map((n) => n!.g)).size;
    const ok = distanciaDaFaixa(f.grupo, f.taxaAleatoria) === 0;
    if (!ok) fora.push(`${f.id} (${f.nome}): ${f.taxaAleatoria}`);
    (porGrupo[f.grupo] ??= []).push(f.taxaAleatoria);
    linhas.push(`| ${f.id} | ${f.grupo} | ${f.nome} | ${f.largura}×${f.altura} | ${new Set(f.desenho.join('')).size} | ${f.grade[0].length} | ${ninhos} | ${canos} | ${f.taxaAleatoria} | ${ok ? 'ok' : 'FORA'} |`);
  }
  const med = (v: number[]) => (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
  const fx = (g: string) => `${FAIXA[g as keyof typeof FAIXA][0]}–${FAIXA[g as keyof typeof FAIXA][1]}`;
  const texto = `# Fases do Formigueiro

60 fases **congeladas** em \`src/fases/fases.json\` (gerar de novo: \`node scripts/gerar.ts [primeira] [ultima]\`, depois \`node scripts/gerar.ts tabela\` para refazer este arquivo).
**Toda fase tem solução provada** (o gerador e o teste refazem a solução no motor: tocar um ninho, esperar parar, tocar o próximo…).

Tempo para refazer tudo: ~18 min de CPU em sequência; em 7 processos em paralelo (ex.: \`1 10\`, \`11 20\`, \`21 30\`, \`31 38\`, \`39 46\`, \`47 53\`, \`54 60\`) ~4 min. O resultado é reproduzível (sementes fixas em \`scripts/lista-fases.ts\`).

## Como são feitas
1. **Imagem**: quadro cheio de quadradinhos (desenho à mão ampliado, de retalhos, ou padrão de código) com cor de fundo.
2. **Planejamento com o motor de verdade**: repete-se "uma unidade" (1 ninho, ou 2–3 ninhos de cores diferentes ligados por cano, sempre de cores com quadradinho EXPOSTO no momento) e roda-se num clone até as formigas pararem; o tamanho \`n\` de cada ninho é reduzido ao que ele realmente entregou. Assim a soma dos \`n\` de cada cor = quadradinhos da cor.
3. **Grade**: as unidades, na ordem do plano, vão para o fundo de uma coluna (3 colunas nas fases 1–20, 4 nas 21–60). Por isso a solução (a ordem do plano) tem sempre o ninho na frente da coluna na hora de tocar. Cano = ninhos vizinhos na mesma linha (colunas mais baixas ganham um lugar vazio até a linha do cano; a grade fica ~75–95% cheia).
   O botão de dificuldade é a **mistura** do layout: com mistura 0 as linhas são quase completas (o que está na frente é o que o plano pede agora); com mistura alta os ninhos avulsos vão para a "pista" do trecho do plano a que pertencem, então os ninhos da frente são do "futuro" (cor ainda escondida) = armadilhas que enchem as 5 vagas.
4. **Dificuldade medida**: \`taxaAleatoria\` = fração de partidas em que um robô que toca ao acaso (entre os toques válidos, rodando 0–30 passos entre os toques) vence. O gerador procura (60 partidas por tentativa) a mistura que deixa a taxa na faixa do grupo; se não achar, tenta outro planejamento (ninhos menores, mais canos). A taxa gravada é medida de novo com 200 partidas (outra semente); fora da faixa, tenta mais 2 sementes e guarda a mais próxima.
5. Imagens "sem camadas" (listras, ondas, setas, raios: todas as cores aparecem na borda) são fáceis demais para o robô; para as fases difíceis usam-se imagens em camadas (anéis, molduras, mandalas, retalhos), em que cores ficam escondidas até as de fora saírem.

## Taxas por grupo (média)
${Object.entries(porGrupo).map(([g, v]) => `- ${g}: média ${med(v)} (faixa-alvo ${fx(g)})`).join('\n')}

${fora.length ? `## Fora da faixa-alvo\n${fora.map((x) => `- ${x}`).join('\n')}\n` : 'Todas as fases estão dentro da faixa-alvo do grupo.\n'}
## Tabela
${linhas.join('\n')}
`;
  writeFileSync(new URL('../FASES.md', import.meta.url), texto);
  console.log(`FASES.md reescrito (${fases.length} fases, ${fora.length} fora da faixa)`);
}

const modo = process.argv[2];
if (modo === 'tabela') {
  tabela();
} else if (modo === 'medir') {
  const a = Number(process.argv[3] ?? 1);
  const b = Number(process.argv[4] ?? 60);
  const fases: Fase[] = JSON.parse(readFileSync(arquivo, 'utf8'));
  for (const f of fases) {
    if (f.id < a || f.id > b) continue;
    const t = taxaAleatoria(f, 200, 777 + f.id);
    console.log(`fase ${f.id} ${f.nome}: ${f.taxaAleatoria} -> ${t} ${distanciaDaFaixa(f.grupo, t) === 0 ? 'ok' : 'FORA'}`);
    gravar({ ...f, taxaAleatoria: t });
  }
} else {
  const de = Number(process.argv[2] ?? 1);
  const ate = Number(process.argv[3] ?? 60);
  const faixas: string[] = [];
  for (const ent of entradas()) {
    if (ent.id < de || ent.id > ate) continue;
    const t0 = Date.now();
    // a busca usa poucas partidas (60); a taxa gravada é medida de novo com 200 partidas (outra semente).
    // Se cair fora da faixa, tenta outra semente (até 3 vezes) e guarda a mais próxima.
    let melhor: { fase: Fase; d: number } | null = null;
    let tent = 0;
    for (const extra of [0, 6000, 12000]) {
      const cand = gerarFase({ ...ent, semente: ent.semente + extra });
      cand.fase.taxaAleatoria = taxaAleatoria(cand.fase, 200, 777 + ent.id);
      const d = distanciaDaFaixa(ent.grupo, cand.fase.taxaAleatoria);
      tent += cand.tentativas;
      if (!melhor || d < melhor.d) melhor = { fase: cand.fase, d };
      if (d === 0) break;
    }
    const f = melhor!.fase;
    const ninhos = f.grade.flat().filter(Boolean).length;
    const cores = new Set(f.desenho.join('')).size;
    const linha = `fase ${String(ent.id).padStart(2)} ${ent.nome.padEnd(20)} ${f.largura}x${f.altura} cores=${cores} ninhos=${ninhos} taxa=${f.taxaAleatoria} ${melhor!.d === 0 ? 'ok' : 'FORA DA FAIXA'} tent=${tent} ${((Date.now() - t0) / 1000).toFixed(1)}s`;
    console.log(linha);
    if (melhor!.d !== 0) faixas.push(linha);
    gravar(f);
  }
  if (faixas.length) console.log('\nFora da faixa:\n' + faixas.join('\n'));
}
