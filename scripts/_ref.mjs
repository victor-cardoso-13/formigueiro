import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
await p.goto('https://www.bubbleshooter.net/game/colony-flow/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await p.waitForTimeout(4000);
await p.mouse.click(215, 248);
await p.waitForTimeout(22000);
await p.mouse.move(215, 360);
await p.waitForTimeout(300);
await p.mouse.down();
await p.waitForTimeout(150);
await p.mouse.up();
for (let i = 1; i <= 10; i++) {
  await p.waitForTimeout(900);
  await p.screenshot({ path: `prints/ref/b${i}.png`, clip: { x: 0, y: 48, width: 430, height: 400 } });
}
await b.close();
