/**
 * Desenho da "arena": o quadro de quadradinhos (num canvas desenhado uma vez), as formigas e a poeirinha (num canvas por cima).
 * Medidas no mesmo sistema do motor (src/motor/geometria.ts): "larguras do quadro" — o quadro vai de x=0 a 1 e de y=0 a h.
 * A arena tem `W` px de largura de quadro, mais uma folga em volta (`pad`) para as formigas que andam pelo contorno.
 */
import { PALETA } from '../fases/paleta.ts';
import { alturaArena, posicaoNoCaminho } from '../motor/geometria.ts';
import { REGRAS } from '../motor/regras.ts';
import type { Formiga } from '../motor/tipos.ts';

export interface Medidas {
  /** largura do quadro em px CSS */
  W: number;
  /** altura/largura do quadro */
  h: number;
  largura: number;
  altura: number;
  /** folga lateral e do topo (px) */
  pad: number;
  /** folga de baixo (px) */
  base: number;
  /** tamanho total da arena (px) */
  Wt: number;
  Ht: number;
  /** lado de uma célula (px, pode ser fracionário) */
  cel: number;
}

export const FOLGA = 0.065;
export const FOLGA_BAIXO = 0.02;
export const COR_CAMPO = '#e4d6b6';

/** Relação altura/largura da arena inteira (com folgas), para a tela calcular o tamanho. */
export const razaoArena = (h: number): number => alturaArena(h) + FOLGA + FOLGA_BAIXO;
export const razaoLargura = 1 + 2 * FOLGA;

export function medir(largura: number, altura: number, W: number): Medidas {
  const h = altura / largura;
  const pad = W * FOLGA;
  const base = W * FOLGA_BAIXO;
  return { W, h, largura, altura, pad, base, Wt: W + 2 * pad, Ht: alturaArena(h) * W + pad + base, cel: W / largura };
}

/** px da arena para uma coordenada em "larguras do quadro". */
export const px = (m: Medidas, x: number): number => m.pad + x * m.W;
export const py = (m: Medidas, y: number): number => m.pad + y * m.W;

export function prepararCanvas(canvas: HTMLCanvasElement, w: number, h: number): { ctx: CanvasRenderingContext2D; dpr: number } {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr };
}

// ---------- cores ----------
function misturar(hex: string, alvo: number, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (alvo - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const CLARA = PALETA.map((c) => misturar(c.cor, 255, 0.38));
const ESCURA = PALETA.map((c) => misturar(c.cor, 0, 0.3));

/** A cor é clara (amarelo, branco, rosa…)? Então o número em cima dela é escuro. */
export function ehClara(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6;
}

// ---------- quadro ----------
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Retângulo (px CSS) da célula, alinhado aos pixels do aparelho para não aparecer fresta entre vizinhas. */
function retCelula(m: Medidas, dpr: number, x: number, y: number) {
  const a = (v: number) => Math.round(v * dpr) / dpr;
  const x0 = a(m.pad + x * m.cel);
  const x1 = a(m.pad + (x + 1) * m.cel);
  const y0 = a(m.pad + y * m.cel);
  const y1 = a(m.pad + (y + 1) * m.cel);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function pintarCelula(ctx: CanvasRenderingContext2D, m: Medidas, dpr: number, x: number, y: number, cor: number) {
  const r = retCelula(m, dpr, x, y);
  ctx.fillStyle = PALETA[cor].cor;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (m.cel >= 5) {
    const u = Math.max(1, Math.round(m.cel * 0.14 * dpr) / dpr);
    ctx.fillStyle = CLARA[cor];
    ctx.fillRect(r.x, r.y, r.w, u);
    ctx.fillRect(r.x, r.y, u, r.h);
    ctx.fillStyle = ESCURA[cor];
    ctx.fillRect(r.x, r.y + r.h - u, r.w, u);
    ctx.fillRect(r.x + r.w - u, r.y, u, r.h);
  } else {
    ctx.fillStyle = ESCURA[cor];
    ctx.fillRect(r.x, r.y + r.h - 0.6, r.w, 0.6);
  }
}

/** Desenha tudo: moldura de madeira, campo e os quadradinhos que ainda estão no quadro. */
export function desenharQuadro(canvas: HTMLCanvasElement, m: Medidas, desenho: number[][]) {
  const { ctx, dpr } = prepararCanvas(canvas, m.Wt, m.Ht);
  ctx.clearRect(0, 0, m.Wt, m.Ht);
  const f = m.W * 0.024; // espessura da moldura
  const X0 = m.pad;
  const Y0 = m.pad;
  const Wq = m.W;
  const Hq = m.h * m.W;
  // sombra e madeira
  ctx.fillStyle = 'rgba(80, 55, 30, 0.22)';
  rr(ctx, X0 - f, Y0 - f + f * 0.45, Wq + 2 * f, Hq + 2 * f, f * 1.2);
  ctx.fill();
  ctx.fillStyle = '#a9794a';
  rr(ctx, X0 - f, Y0 - f, Wq + 2 * f, Hq + 2 * f, f * 1.2);
  ctx.fill();
  ctx.fillStyle = '#d9b27a';
  rr(ctx, X0 - f + f * 0.14, Y0 - f + f * 0.14, Wq + 2 * f - f * 0.28, Hq + 2 * f - f * 0.28, f * 1.1);
  ctx.fill();
  ctx.fillStyle = COR_CAMPO;
  ctx.fillRect(X0, Y0, Wq, Hq);
  ctx.fillStyle = 'rgba(80, 55, 30, 0.16)';
  ctx.fillRect(X0, Y0, Wq, Math.max(1.5, f * 0.2));
  for (let y = 0; y < m.altura; y++) for (let x = 0; x < m.largura; x++) if (desenho[y][x] >= 0) pintarCelula(ctx, m, dpr, x, y, desenho[y][x]);
}

/** Apaga um quadradinho (a formiga pegou). */
export function apagarCelula(canvas: HTMLCanvasElement, m: Medidas, x: number, y: number) {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r = retCelula(m, dpr, x, y);
  ctx.fillStyle = COR_CAMPO;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

// ---------- poeirinha ----------
export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t0: number;
  vida: number;
  cor: number;
  s: number;
}

/** Alguns quadradinhos voando e sumindo (efeito de pegar / entregar). `sentido` = -1 sobe, 1 cai. */
export function soltarPoeira(lista: Particula[], x: number, y: number, cor: number, tam: number, agora: number, n = 5, sentido = -1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (x + y) * 7;
    const v = tam * (1.2 + (i % 3) * 0.5);
    lista.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + sentido * tam * 0.8, t0: agora, vida: 380 + (i % 3) * 60, cor, s: tam * (0.22 + (i % 2) * 0.1) });
  }
}

// ---------- formigas ----------
function desenharFormiga(ctx: CanvasRenderingContext2D, x: number, y: number, angGraus: number, L: number, cor: number, levando: boolean, fase: number, esc: number) {
  const { cor: c, escura: e } = PALETA[cor];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angGraus * Math.PI) / 180);
  ctx.scale(esc, esc);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // sombrinha
  ctx.fillStyle = 'rgba(60, 40, 20, 0.2)';
  ctx.beginPath();
  ctx.ellipse(L * 0.06, L * 0.1, L * 0.24, L * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  // perninhas
  ctx.strokeStyle = e;
  ctx.lineWidth = Math.max(1, L * 0.07);
  const bal = Math.sin(fase) * L * 0.09;
  for (const [yy, dx, dy] of [
    [-0.12, 0.34, -0.14],
    [-0.04, 0.38, 0.02],
    [0.04, 0.32, 0.18],
  ] as const) {
    const s = yy === -0.04 ? -1 : 1;
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(lado * L * 0.05, yy * L);
      ctx.lineTo(lado * L * dx, (yy + dy) * L + s * bal * lado);
      ctx.stroke();
    }
  }
  // antenas
  ctx.lineWidth = Math.max(1, L * 0.055);
  ctx.beginPath();
  ctx.moveTo(-L * 0.06, -L * 0.42);
  ctx.quadraticCurveTo(-L * 0.2, -L * 0.6, -L * 0.3, -L * 0.62);
  ctx.moveTo(L * 0.06, -L * 0.42);
  ctx.quadraticCurveTo(L * 0.2, -L * 0.6, L * 0.3, -L * 0.62);
  ctx.stroke();
  // corpo
  ctx.fillStyle = c;
  ctx.lineWidth = Math.max(1, L * 0.085);
  const parte = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  parte(0, L * 0.27, L * 0.17, L * 0.23);
  parte(0, -L * 0.06, L * 0.13, L * 0.15);
  parte(0, -L * 0.33, L * 0.15, L * 0.14);
  // olhinhos
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-L * 0.06, -L * 0.37, L * 0.035, 0, Math.PI * 2);
  ctx.arc(L * 0.06, -L * 0.37, L * 0.035, 0, Math.PI * 2);
  ctx.fill();
  if (levando) {
    const q = L * 0.4;
    ctx.fillStyle = c;
    ctx.strokeStyle = e;
    ctx.lineWidth = Math.max(1, L * 0.07);
    ctx.beginPath();
    ctx.roundRect(-q / 2, -L * 0.5 - q * 0.9, q, q, q * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CLARA[cor];
    ctx.fillRect(-q / 2 + q * 0.12, -L * 0.5 - q * 0.9 + q * 0.12, q * 0.5, q * 0.14);
  }
  ctx.restore();
}

/** Refaz a camada das formigas e da poeirinha. `frac` (0..1) = quanto do passo seguinte já andou (movimento suave). */
export function desenharCamada(canvas: HTMLCanvasElement, m: Medidas, formigas: Formiga[], particulas: Particula[], frac: number, agora: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, m.Wt, m.Ht);
  const L = Math.max(m.W * 0.054, 22);
  for (const f of formigas) {
    const total = f.acumulado[f.acumulado.length - 1];
    const prog = Math.min(total, f.prog + frac * REGRAS.VELOCIDADE);
    const p = posicaoNoCaminho(f.caminho, f.acumulado, prog);
    const resto = total - prog;
    const esc = f.fase === 'volta' && resto < 0.07 ? Math.max(0.35, resto / 0.07) : 1;
    desenharFormiga(ctx, px(m, p.x), py(m, p.y), p.ang, L, f.cor, f.fase === 'volta', prog * 90, esc);
  }
  // poeirinha
  for (let i = particulas.length - 1; i >= 0; i--) {
    const q = particulas[i];
    const t = (agora - q.t0) / q.vida;
    if (t >= 1) {
      particulas.splice(i, 1);
      continue;
    }
    const k = t * (q.vida / 1000);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = PALETA[q.cor].cor;
    ctx.strokeStyle = PALETA[q.cor].escura;
    ctx.lineWidth = 1;
    const sz = q.s * (1 - t * 0.4);
    const qx = q.x + q.vx * k;
    const qy = q.y + q.vy * k + 14 * k * k * m.W * 0.02;
    ctx.fillRect(qx - sz / 2, qy - sz / 2, sz, sz);
    ctx.strokeRect(qx - sz / 2, qy - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

export function limparCamada(canvas: HTMLCanvasElement, m: Medidas) {
  canvas.getContext('2d')!.clearRect(0, 0, m.Wt, m.Ht);
}
