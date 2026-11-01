// Joga de verdade no navegador: segue a solução da fase até "Ganhou!"; depois força uma derrota,
// usa Desfazer e Recomeçar (com confirmação).
// Uso: (npx vite --port 5194 --strictPort rodando) node scripts/jogar-teste.mjs [fase|teste] [porta]
//   fase   número da fase em src/fases/fases.json (padrão 1), ou "teste" = src/fases/fase-teste.json
// Precisa do gancho ?teste=1 (a tela do jogo expõe window.__formigueiro.estado()).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const qual = process.argv[2] ?? '1';
const porta = process.argv[3] ?? '5194';
const arquivo = qual === 'teste' ? '../src/fases/fase-teste.json' : '../src/fases/fases.json';
const lido = JSON.parse(readFileSync(new URL(arquivo, import.meta.url), 'utf8'));
const fase = qual === 'teste' ? lido : lido.find((f) => String(f.id) === qual);
if (!fase?.solucao) {
  console.log(`FALHOU: a fase "${qual}" não existe ou não tem "solucao" em ${arquivo}`);
  process.exit(1);
}
const url = `http://localhost:${porta}/?limpo=1&visto=1&tela=jogo&fase=${qual}&teste=1`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
let falhou = false;
const falhar = (m) => {
  console.log('FALHOU:', m);
  falhou = true;
};

const estado = () => page.evaluate(() => window.__formigueiro.estado());
const cortinaAberta = () => page.$('#cortina:not([hidden]) .cartao h2');

/** Espera tudo parar: nenhuma formiga andando e nada mudando por um tempinho (ou a cortina abrir). */
async function esperarParar() {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('#cortina');
      if (c && !c.hidden) return true;
      const e = window.__formigueiro.estado();
      if (e.formigas.length > 0) {
        window.__quieto = 0;
        return false;
      }
      const sig = JSON.stringify([e.pedacos, e.vagas.map((n) => n && [n.id, n.restam])]);
      if (sig === window.__sig) window.__quieto = (window.__quieto ?? 0) + 1;
      else ((window.__sig = sig), (window.__quieto = 0));
      return window.__quieto >= 8; // ~8 verificações seguidas sem mudança
    },
    null,
    { timeout: 60000, polling: 60 },
  );
}

async function velocidade3() {
  for (let i = 0; i < 3; i++) {
    const t = (await page.textContent('#bVel')) ?? '';
    if (t.includes('3')) return;
    await page.click('#bVel');
  }
}

async function abrir() {
  await page.goto(url);
  await page.waitForSelector('button.ninho');
  await velocidade3();
}

async function tocar(id) {
  const sel = `button.ninho[data-id="${id}"]`;
  await page.waitForSelector(`${sel}.frente`, { timeout: 15000 });
  await page.click(sel);
  await esperarParar();
}

const titulo = async () => (await cortinaAberta()) && (await page.textContent('#cortina .cartao h2'));

// 1) vitória seguindo a solução
await abrir();
for (const id of fase.solucao) {
  await tocar(id).catch((e) => falhar(`toque no ninho ${id}: ${e.message.split('\n')[0]}`));
  if (falhou || (await titulo())) break;
}
await page.waitForSelector('#cortina:not([hidden]) .cartao h2', { timeout: 15000 }).catch(() => {});
const t1 = await titulo();
console.log(`fase ${qual}: ${t1 || '(sem cortina)'}  (${fase.solucao.length} toques)`);
if (t1 !== 'Ganhou!') falhar('a solução não terminou em "Ganhou!"');

// 2) derrota: toca ninhos fora de ordem (tenta algumas ordens até perder)
let perdeu = false;
for (let tentativa = 0; tentativa < 8 && !perdeu; tentativa++) {
  await abrir();
  for (let k = 0; k < 80; k++) {
    if (await titulo()) break;
    const ids = await page.$$eval('button.ninho.frente', (bs) => bs.map((b) => Number(b.dataset.id)));
    if (!ids.length) break;
    // tentativa 0: sempre o último da frente; 1: o primeiro; depois alterna em saltos
    const id = tentativa === 0 ? ids[ids.length - 1] : tentativa === 1 ? ids[0] : ids[(k * (tentativa - 1) + tentativa) % ids.length];
    await tocar(id).catch(() => {});
    // se o toque foi recusado (sem vaga), as formigas já pararam e o laço segue
  }
  perdeu = (await titulo()) === 'Perdeu';
}
if (!perdeu) {
  console.log('AVISO: não consegui perder tocando fora de ordem (fase folgada demais?) — pulei Desfazer/Recomeçar do caminho da derrota');
} else {
  console.log('derrota:', await page.textContent('#cortina .cartao h2'), '·', (await page.textContent('#cortina .cartao p'))?.trim());
  await page.click('#cDesfazer');
  await page.waitForFunction(() => document.querySelector('#cortina').hidden, null, { timeout: 5000 });
  const r = (await estado()).resultado;
  console.log('depois do Desfazer:', r);
  if (r !== 'jogando') falhar('Desfazer não voltou ao jogo');
}

// 3) Recomeçar com confirmação (vale também sem derrota): "Não" mantém, "Sim" volta ao começo
if (!(await cortinaAberta()) || perdeu) {
  await page.click('#bRecomecar');
  await page.waitForSelector('#cNao', { timeout: 5000 }).catch(() => falhar('Recomeçar não pediu confirmação'));
  if (await page.$('#cNao')) {
    await page.click('#cNao');
    await page.waitForFunction(() => !document.querySelector('#cSim'), null, { timeout: 5000 }).catch(() => falhar('"Não" não fechou a confirmação'));
    await page.click('#bRecomecar');
    await page.click('#cSim');
    await page.waitForFunction(() => !document.querySelector('#cSim'), null, { timeout: 5000 }).catch(() => {});
    const e = await estado();
    const grade = e.grade.flat().filter(Boolean).length;
    const total = fase.grade.flat().filter(Boolean).length;
    console.log(`depois do Recomeçar: quadradinhos ${e.pedacos}, ninhos na grade ${grade}/${total}, resultado ${e.resultado}`);
    if (e.resultado !== 'jogando' || grade !== total || e.vagas.some(Boolean) || e.formigas.length) falhar('Recomeçar não voltou ao começo');
  }
}

if (erros.length) falhar('erros na página: ' + erros.join(' | '));
console.log(falhou ? 'COM FALHAS' : 'TUDO CERTO');
await browser.close();
process.exit(falhou ? 1 : 0);
