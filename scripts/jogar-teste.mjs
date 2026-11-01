// Joga de verdade no navegador: segue a solução da fase 1 até "Ganhou!"; depois força uma derrota e usa Desfazer.
// Uso: (npx vite --port 5191 rodando) node scripts/jogar-teste.mjs [porta]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const porta = process.argv[2] ?? '5191';
const fases = JSON.parse(readFileSync(new URL('../src/fases/fases.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
const falhar = (m) => {
  console.log('FALHOU:', m);
  process.exitCode = 1;
};

async function esperarTrilhaVazia() {
  await page.waitForFunction(() => document.querySelectorAll('.fm-trilha:not(.foi)').length === 0, null, { timeout: 20000 });
}

async function jogarSolucao(id) {
  const f = fases.find((x) => x.id === id);
  await page.goto(`http://localhost:${porta}/?limpo=1&visto=1&tela=jogo&fase=${id}&teste=1`);
  await page.waitForSelector('.tile');
  if (await page.$('#cEntendi')) await page.click('#cEntendi');
  await page.click('#bVel');
  await page.click('#bVel'); // 5×
  for (const t of f.solucao) {
    const seletor = t >= 10 ? `[data-e="${t - 10}"]` : `[data-c="${t}"] .tile`;
    await page.click(seletor);
    await esperarTrilhaVazia().catch(() => {});
    if (await page.$('.cortina:not([hidden]) .cartao')) break;
  }
  await page.waitForSelector('.cortina:not([hidden]) .cartao h2', { timeout: 10000 });
  return page.textContent('.cortina:not([hidden]) .cartao h2');
}

// 1) vitória seguindo a solução
for (const id of [1, 9, 16, 36, 41, 60]) {
  const titulo = await jogarSolucao(id);
  console.log(`fase ${id}:`, titulo);
  if (titulo !== 'Ganhou!') falhar(`fase ${id} não terminou em Ganhou!`);
}
// o mapa deve mostrar a fase ganha e liberar a seguinte
await page.goto(`http://localhost:${porta}/?tela=mapa`);
await page.click('.aba[data-g="muito-dificil"]');
const ganhas = await page.$$eval('.fase.ganha', (b) => b.length);
console.log('fases ganhas no mapa:', ganhas);
if (ganhas < 1) falhar('mapa não mostra as fases ganhas');

// 2) derrota: enche a espera por dentro e manda uma formiga com fome demais
await page.goto(`http://localhost:${porta}/?limpo=1&visto=1&tela=jogo&fase=1&teste=1`);
await page.waitForSelector('.tile');
await page.click('#bVel');
await page.click('#bVel');
// primeiro um toque normal (cria o "antes" do Desfazer) e espera acabar
await page.click('[data-c="0"] .tile');
await esperarTrilhaVazia();
await page.evaluate(() => {
  const e = window.__formigueiro.estado();
  for (let i = 0; i < e.espera.length; i++) if (!e.espera[i]) e.espera[i] = { id: 900 + i, cor: 0, fome: 1 };
  e.colunas[1][0].fome = 999;
});
await page.click('[data-c="1"] .tile');
await page.waitForSelector('.cortina:not([hidden]) .cartao h2', { timeout: 20000 });
const t2 = await page.textContent('.cortina:not([hidden]) .cartao h2');
console.log('derrota:', t2, '·', await page.textContent('.cartao p'));
if (t2 !== 'Perdeu') falhar('não perdeu');
await page.click('#cDesfazer');
await page.waitForFunction(() => document.querySelector('#cortina').hidden);
const estado = await page.evaluate(() => window.__formigueiro.estado().resultado);
console.log('depois do Desfazer:', estado);
if (estado !== 'jogando') falhar('Desfazer não voltou ao jogo');
if (erros.length) falhar('erros na página: ' + erros.join(' | '));
console.log(process.exitCode ? 'COM FALHAS' : 'TUDO CERTO');
await browser.close();
