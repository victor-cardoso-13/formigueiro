// Prints automáticos nos aparelhos que importam, com detecção de rolagem e de erros.
// Uso: (npx vite --port 5194 --strictPort rodando) node scripts/prints.mjs <pasta> <porta> [cena] [fase]
//   pasta  onde salvar (padrão "prints")        porta  do vite (padrão 5194)
//   cena   só uma cena (ex.: "tutorial-3"); sem isso, tira todas
//   fase   número da fase, ou "teste" (padrão) = src/fases/fase-teste.json enquanto fases.json não tem as fases novas
// Nunca iPhone SE. iPad 1180×820 e 820×1180; iPhone em pé 440×800 e 390×844; deitado 956×360;
// mais um 393×852 com a área segura do iPhone (topo 59, base 34) via CDP.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const pasta = process.argv[2] ?? 'prints';
const porta = process.argv[3] ?? '5194';
const so = process.argv[4];
const fase = process.argv[5] ?? 'teste';
mkdirSync(pasta, { recursive: true });

const aparelhos = {
  'ipad-deitado': { w: 1180, h: 820 },
  'ipad-em-pe': { w: 820, h: 1180 },
  'iphone-440': { w: 440, h: 800 },
  'iphone-390': { w: 390, h: 844 },
  'iphone-deitado': { w: 956, h: 360 },
  'iphone-seguro': { w: 393, h: 852, seguro: { top: 59, bottom: 34 } },
};

// cada cena = parâmetros na URL (ver src/main.ts)
const jogo = `?limpo=1&visto=1&tela=jogo&fase=${fase}&teste=1`;
const cenas = {
  inicio: '?limpo=1&tela=inicio',
  mapa: '?limpo=1&ganhas=14&tela=mapa',
  ajustes: '?limpo=1&tela=ajustes',
  'jogo-comeco': jogo,
  'jogo-meio': `${jogo}&demo=meio`,
  ganhou: `${jogo}&demo=ganhou`,
  perdeu: `${jogo}&demo=perdeu`,
  'jogo-vagas': `${jogo}&demo=vagas`,
  'tutorial-1': '?limpo=1&tela=tutorial',
  'tutorial-2': '?limpo=1&tela=tutorial&passo=1',
  'tutorial-3': '?limpo=1&tela=tutorial&passo=2',
  'tutorial-4': '?limpo=1&tela=tutorial&passo=3',
  'tutorial-5': '?limpo=1&tela=tutorial&passo=4',
  'tutorial-6': '?limpo=1&tela=tutorial&passo=5',
};

/** Roda dentro da página: acha o que rola de verdade ou sai da tela. */
function medir() {
  const achados = [];
  const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const doc = document.documentElement;
  if (doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1) achados.push(`documento ${doc.scrollWidth}x${doc.scrollHeight} > ${innerWidth}x${innerHeight}`);
  const app = document.getElementById('app');
  if (app) {
    for (const el of [app, ...app.querySelectorAll('*')]) {
      if (el instanceof SVGElement || !el.clientHeight) continue;
      if (el.scrollHeight > el.clientHeight + 3 || el.scrollWidth > el.clientWidth + 3) achados.push(`rola: ${nome(el)} ${el.scrollWidth}x${el.scrollHeight} em ${el.clientWidth}x${el.clientHeight}`);
    }
    for (const el of app.children) {
      const r = el.getBoundingClientRect();
      if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1) achados.push(`fora da tela: ${nome(el)}`);
    }
  }
  return achados.slice(0, 5);
}

const browser = await chromium.launch();
let problemas = 0;
const feitos = [];
for (const [nomeAp, ap] of Object.entries(aparelhos)) {
  for (const [cena, q] of Object.entries(cenas)) {
    if (so && so !== cena) continue;
    const page = await browser.newPage({ viewport: { width: ap.w, height: ap.h }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => (problemas++, console.log('ERRO DE PÁGINA', nomeAp, cena, e.message)));
    page.on('console', (m) => {
      if (m.type() === 'error') (problemas++, console.log('ERRO NO CONSOLE', nomeAp, cena, m.text()));
    });
    if (ap.seguro) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: ap.seguro.top, bottom: ap.seguro.bottom, left: 0, right: 0 } });
    }
    await page.goto(`http://localhost:${porta}/${q}`);
    await page.waitForTimeout(600);
    const achados = await page.evaluate(medir);
    for (const a of achados) (problemas++, console.log('ROLAGEM', nomeAp, cena, '→', a));
    const arq = `${pasta}/${cena}-${nomeAp}.png`;
    await page.screenshot({ path: arq });
    feitos.push(arq);
    await page.close();
  }
}
await browser.close();
console.log(`${feitos.length} prints em ${pasta}/ · ${problemas ? problemas + ' problema(s)' : 'sem rolagem nem erros'}`);
