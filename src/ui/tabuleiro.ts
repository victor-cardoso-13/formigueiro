/**
 * O tabuleiro: um canvas com o desenho e a trilha em volta (anel de 1 célula).
 * As formigas que andam são elementos HTML por cima (ver tela-jogo.ts); aqui só se desenha o fundo e os pedacinhos.
 */
import { PALETA } from '../fases/paleta.ts';
import type { Estado } from '../motor/tipos.ts';

export interface Geometria {
  /** lado de uma célula em px CSS */
  s: number;
  larguraPx: number;
  alturaPx: number;
}

export function medir(L: number, A: number, maxW: number, maxH: number): Geometria {
  const s = Math.max(4, Math.floor(Math.min(maxW / (L + 2), maxH / (A + 2))));
  return { s, larguraPx: s * (L + 2), alturaPx: s * (A + 2) };
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export interface OpcoesDesenho {
  /** cores (índices) que alguma formiga pronta pode comer: os pedacinhos à vista ganham contorno */
  destacar: Set<number>;
  /** pedacinhos à vista ("x,y") */
  aVista: Set<string>;
  /** cor em foco (dedo em cima de uma formiga): contorno mais forte */
  foco: number | null;
}

export function desenhar(canvas: HTMLCanvasElement, g: Geometria, e: Estado, op: OpcoesDesenho) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(g.larguraPx * dpr);
  canvas.height = Math.round(g.alturaPx * dpr);
  canvas.style.width = `${g.larguraPx}px`;
  canvas.style.height = `${g.alturaPx}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = g.s;
  const L = e.largura;
  const A = e.altura;
  // mesa, trilha e campo
  ctx.fillStyle = '#e3d0ad';
  rr(ctx, 0, 0, g.larguraPx, g.alturaPx, s * 0.7);
  ctx.fill();
  ctx.fillStyle = '#d6bf96';
  rr(ctx, s * 0.5, s * 0.5, (L + 1) * s, (A + 1) * s, s * 0.45);
  ctx.fill();
  ctx.fillStyle = '#f6ead4';
  rr(ctx, s, s, L * s, A * s, s * 0.2);
  ctx.fill();
  // pedacinhos
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const c = e.desenho[y][x];
      if (!c) continue;
      const px = (x + 1) * s;
      const py = (y + 1) * s;
      const { cor, escura } = PALETA[c.cor];
      const m = s * 0.07;
      const w = s - 2 * m;
      const vis = op.aVista.has(`${x},${y}`);
      const forte = vis && op.foco === c.cor && !c.folha;
      const suave = vis && op.destacar.has(c.cor) && !c.folha;
      if (forte || suave) {
        ctx.fillStyle = forte ? '#fff' : 'rgba(255,255,255,0.9)';
        rr(ctx, px + m * 0.2, py + m * 0.2, s - m * 0.4, s - m * 0.4, s * 0.28);
        ctx.fill();
        ctx.strokeStyle = forte ? '#3b2f2a' : escura;
        ctx.lineWidth = Math.max(1.5, s * (forte ? 0.1 : 0.06));
        ctx.stroke();
      }
      const ins = forte ? s * 0.14 : suave ? s * 0.1 : m;
      const ww = s - 2 * ins;
      ctx.fillStyle = cor;
      rr(ctx, px + ins, py + ins, ww, ww, s * 0.2);
      ctx.fill();
      ctx.strokeStyle = escura;
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.stroke();
      if (s >= 8) {
        // brilhinho de açúcar
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        rr(ctx, px + ins + ww * 0.15, py + ins + ww * 0.13, ww * 0.26, ww * 0.14, ww * 0.06);
        ctx.fill();
      }
      void w;
      if (c.duro) {
        // torrão duro: borda grossa + faceta; rachado = risco no meio
        ctx.strokeStyle = '#3b2f2a';
        ctx.lineWidth = Math.max(1.5, s * 0.09);
        rr(ctx, px + ins, py + ins, ww, ww, s * 0.12);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(px + ins + ww * 0.7, py + ins + ww * 0.2);
        ctx.lineTo(px + ins + ww * 0.82, py + ins + ww * 0.32);
        ctx.stroke();
        if (c.mordidas === 1) {
          ctx.strokeStyle = '#3b2f2a';
          ctx.lineWidth = Math.max(1.5, s * 0.08);
          ctx.beginPath();
          ctx.moveTo(px + ins + ww * 0.25, py + ins + ww * 0.1);
          ctx.lineTo(px + ins + ww * 0.5, py + ins + ww * 0.45);
          ctx.lineTo(px + ins + ww * 0.38, py + ins + ww * 0.6);
          ctx.lineTo(px + ins + ww * 0.7, py + ins + ww * 0.9);
          ctx.stroke();
        }
      }
      if (c.folha) {
        // folha seca por cima (a cor continua aparecendo nas pontas)
        ctx.save();
        ctx.translate(px + s / 2, py + s / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = 'rgba(107,142,35,0.93)';
        ctx.strokeStyle = '#3f5a14';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.46, s * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, 0);
        ctx.lineTo(s * 0.4, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
