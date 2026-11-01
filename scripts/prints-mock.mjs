// Tira prints do mock estático. Uso: node scripts/prints-mock.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
mkdirSync('prints', { recursive: true });
const arq = fileURLToPath(new URL('./mock-tela.html', import.meta.url));
const b = await chromium.launch();
for (const [nome, w, h, modo] of [['mock-em-pe', 390, 844, 'pe'], ['mock-deitado', 956, 360, 'deitado']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(`file://${arq}?modo=${modo}`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `prints/${nome}.png` });
  await p.close();
}
await b.close();
