// Gera os ícones do jogo (formiga + pedacinhos de açúcar) com o Playwright. Uso: node scripts/icones.mjs
import { chromium } from 'playwright';
import { PALETA } from '../src/fases/paleta.ts';

const P = (l) => PALETA.find((c) => c.letra === l);
function quad(x, y, l, s = 112) {
  const { cor, escura } = P(l);
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="26" fill="${cor}" stroke="${escura}" stroke-width="8"/>
  <rect x="${x + s * 0.17}" y="${y + s * 0.14}" width="${s * 0.28}" height="${s * 0.14}" rx="7" fill="#fff" opacity=".6"/>`;
}
const { cor: corF, escura: escF } = P('r');
// formiga grande (olhando para cima, girada), desenhada no mesmo estilo do jogo
const formiga = `<g transform="translate(256 190) rotate(-28) scale(5.2) translate(-32 -34)">
  <g stroke="${escF}" stroke-width="2.8" stroke-linecap="round" fill="none"><path d="M24 28 10 22M24 34 8 36M25 41 12 52M40 28 54 22M40 34 56 36M39 41 52 52M28 12Q24 4 18 5M36 12Q40 4 46 5"/></g>
  <g fill="${corF}" stroke="${escF}" stroke-width="2.8"><ellipse cx="32" cy="50" rx="11" ry="12"/><ellipse cx="32" cy="33" rx="8" ry="8"/><circle cx="32" cy="18" r="9.5"/></g>
  <g stroke="${escF}" stroke-width="1.6"><circle cx="28" cy="16" r="3.2" fill="#fff"/><circle cx="36" cy="16" r="3.2" fill="#fff"/></g>
  <circle cx="28.6" cy="15.6" r="1.4" fill="#222"/><circle cx="36.6" cy="15.6" r="1.4" fill="#222"/></g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs><radialGradient id="f" cx="50%" cy="20%" r="90%"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#f3c969"/></radialGradient></defs>
  <rect width="512" height="512" fill="url(#f)"/>
  ${quad(68, 336, 'y')}${quad(200, 336, 'b')}${quad(332, 336, 'g')}
  ${formiga}
</svg>`;
const html = `<!doctype html><html><body style="margin:0;overflow:hidden">${svg}</body></html>`;
const b = await chromium.launch();
for (const [arquivo, t] of [['icone-512.png', 512], ['icone-192.png', 192], ['apple-touch-icon.png', 180]]) {
  const p = await b.newPage({ viewport: { width: t, height: t }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.screenshot({ path: `public/${arquivo}` });
  await p.close();
}
await b.close();
console.log('ícones gerados em public/');
