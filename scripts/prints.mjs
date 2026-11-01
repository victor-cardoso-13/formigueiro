// Prints automáticos nos aparelhos que importam. Uso: (npx vite --port 5199 rodando) node scripts/prints.mjs <pasta> [porta]
// Nunca iPhone SE. iPad 1180×820 e 820×1180; iPhone em pé 440×800 e 390×844; deitado 956×360.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const pasta = process.argv[2] ?? 'prints';
const porta = process.argv[3] ?? '5199';
mkdirSync(pasta, { recursive: true });
const telas = { 'ipad-deitado': [1180, 820], 'ipad-em-pe': [820, 1180], 'iphone-440': [440, 800], 'iphone-390': [390, 844], 'iphone-deitado': [956, 360] };
// cada tela do jogo, por parâmetros na URL (ver src/main.ts)
const cenas = {
  inicio: '?limpo=1&tela=inicio',
  mapa: '?limpo=1&ganhas=14&tela=mapa',
  'jogo-comeco': '?limpo=1&visto=1&tela=jogo&fase=9',
  'jogo-meio': '?limpo=1&visto=1&tela=jogo&fase=9&demo=meio',
  'jogo-meio-grande': '?limpo=1&visto=1&tela=jogo&fase=10&demo=meio',
  ganhou: '?limpo=1&visto=1&tela=jogo&fase=9&demo=ganhou',
  perdeu: '?limpo=1&visto=1&tela=jogo&fase=9&demo=perdeu',
  tutorial: '?limpo=1&tela=tutorial',
  'tutorial-4': '?limpo=1&tela=tutorial&passo=3',
};
const extras = (process.argv[5] ?? '').split(',').filter(Boolean); // cenas extras: nome=?query
const so = process.argv[4]; // opcional: só uma cena
const browser = await chromium.launch();
for (const [nome, [width, height]] of Object.entries(telas)) {
  for (const [cena, q] of Object.entries(cenas)) {
    if (so && so !== cena) continue;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => console.log('ERRO', nome, cena, e.message));
    await page.goto(`http://localhost:${porta}/${q}`);
    await page.waitForTimeout(500);
    const rolagem = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1);
    if (rolagem) console.log('ROLAGEM em', nome, cena);
    await page.screenshot({ path: `${pasta}/${cena}-${nome}.png` });
    await page.close();
  }
}
void extras;
await browser.close();
