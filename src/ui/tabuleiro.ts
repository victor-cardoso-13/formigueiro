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

export const FOLGA = 0.04;
export const FOLGA_BAIXO = 0.02;
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
const CLARA = PALETA.map((c) => misturar(c.cor, 255, 0.45));
const ESCURA = PALETA.map((c) => misturar(c.cor, 0, 0.3));
/** "Lado" do bloquinho 3D (embaixo) — mais escuro que a face de cima. */
const LADO = PALETA.map((c) => misturar(c.cor, 0, c.cor.toLowerCase() === '#fffdf6' ? 0.2 : 0.28));
/** Fresta entre um bloquinho e o vizinho (bem fina, quase da cor do bloco). */

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
  if (m.cel < 5) {
    ctx.fillStyle = PALETA[cor].cor;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = LADO[cor];
    ctx.fillRect(r.x, r.y + r.h - 0.7, r.w, 0.7);
    return;
  }
  const c = m.cel;
  const g = Math.max(0.3, c * 0.015);
  const raio = c * 0.15;
  // corpo do bloco = lado (escuro), por baixo
  ctx.fillStyle = LADO[cor];
  rr(ctx, r.x + g, r.y + g, r.w - 2 * g, r.h - 2 * g, raio);
  ctx.fill();
  // face de cima (um pouco mais curta: o "lado" aparece embaixo)
  ctx.fillStyle = PALETA[cor].cor;
  rr(ctx, r.x + g, r.y + g, r.w - 2 * g, r.h - 2 * g - c * 0.16, raio);
  ctx.fill();
}

/** Desenha tudo: moldura cinza-lilás arredondada, bandeja e os quadradinhos que ainda estão no quadro. */
export function desenharQuadro(canvas: HTMLCanvasElement, m: Medidas, desenho: number[][]) {
  const { ctx, dpr } = prepararCanvas(canvas, m.Wt, m.Ht);
  ctx.clearRect(0, 0, m.Wt, m.Ht);
  const Hq = m.h * m.W;
  // moldura: vai da borda da arena até um pouco abaixo do quadro
  const ox = 1;
  const oy = 1;
  const ow = m.Wt - 2;
  const oh = m.pad + Hq + m.pad * 0.95 - oy;
  const R = m.pad * 1.15;
  // só o aro arredondado: dentro fica transparente (o fundo da tela aparece onde os quadradinhos saem)
  const aro = (x: number, y: number, w: number, h: number, r: number, xi: number, yi: number, wi: number, hi: number, ri: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.roundRect(xi, yi, wi, hi, ri);
    ctx.fill('evenodd');
  };
  const t = m.pad * 0.36;
  const bx = ox + t;
  const by = oy + t;
  const bw = ow - 2 * t;
  const bh = oh - 2 * t;
  const Ri = R * 0.7;
  ctx.fillStyle = 'rgba(30, 30, 60, 0.28)';
  aro(ox, oy + m.W * 0.012, ow, oh, R, bx, by + m.W * 0.012, bw, bh, Ri);
  ctx.fillStyle = '#8a8fb8';
  aro(ox, oy, ow, oh, R, bx, by, bw, bh, Ri);
  const borda = m.W * 0.006;
  ctx.fillStyle = '#a3a7cc';
  aro(ox + borda, oy + borda, ow - 2 * borda, oh - 2 * borda - m.W * 0.006, R * 0.95, bx, by, bw, bh, Ri);
  ctx.strokeStyle = '#585d88';
  ctx.lineWidth = m.W * 0.006;
  rr(ctx, bx, by, bw, bh, Ri);
  ctx.stroke();
  for (let y = 0; y < m.altura; y++) for (let x = 0; x < m.largura; x++) if (desenho[y][x] >= 0) pintarCelula(ctx, m, dpr, x, y, desenho[y][x]);
}

/** Apaga um quadradinho (a formiga pegou). */
export function apagarCelula(canvas: HTMLCanvasElement, m: Medidas, x: number, y: number) {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r = retCelula(m, dpr, x, y);
  ctx.clearRect(r.x, r.y, r.w, r.h);
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
/** Corpo da formiga (sem as perninhas) desenhado uma vez por cor e tamanho, com brilho 3D; depois só é carimbado. */
const moldes = new Map<string, HTMLCanvasElement>();
function moldeFormiga(cor: number, L: number, dpr: number): HTMLCanvasElement {
  const chave = `${cor}:${Math.round(L * 10)}:${dpr}`;
  const pronto = moldes.get(chave);
  if (pronto) return pronto;
  const S = L * 1.5;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(S * dpr);
  cv.height = Math.ceil(S * dpr);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, (S * dpr) / 2, (S * dpr) / 2);
  const { cor: c, escura: e } = PALETA[cor];
  ctx.lineCap = 'round';
  // antenas com bolinha na ponta
  ctx.strokeStyle = e;
  ctx.lineWidth = Math.max(1, L * 0.045);
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(lado * L * 0.06, -L * 0.42);
    ctx.quadraticCurveTo(lado * L * 0.1, -L * 0.6, lado * L * 0.24, -L * 0.64);
    ctx.stroke();
    ctx.fillStyle = e;
    ctx.beginPath();
    ctx.arc(lado * L * 0.25, -L * 0.64, L * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  const parte = (cx: number, cy: number, rx: number, ry: number) => {
    const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, rx * 0.1, cx, cy, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, CLARA[cor]);
    g.addColorStop(0.45, c);
    g.addColorStop(1, ESCURA[cor]);
    ctx.fillStyle = g;
    ctx.strokeStyle = e;
    ctx.lineWidth = Math.max(0.8, L * 0.035);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  parte(0, L * 0.26, L * 0.2, L * 0.25);
  parte(0, -L * 0.04, L * 0.105, L * 0.12);
  parte(0, -L * 0.3, L * 0.17, L * 0.16);
  // olhos grandes
  for (const lado of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = e;
    ctx.lineWidth = Math.max(0.6, L * 0.02);
    ctx.beginPath();
    ctx.ellipse(lado * L * 0.075, -L * 0.36, L * 0.06, L * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.arc(lado * L * 0.08, -L * 0.385, L * 0.033, 0, Math.PI * 2);
    ctx.fill();
  }
  moldes.set(chave, cv);
  return cv;
}

/** Quadradinho 3D carregado na boca. */
function quadradinho(ctx: CanvasRenderingContext2D, cx: number, cy: number, q: number, cor: number) {
  ctx.fillStyle = PALETA[cor].escura;
  rr(ctx, cx - q / 2 - q * 0.06, cy - q / 2 - q * 0.06, q * 1.12, q * 1.12, q * 0.26);
  ctx.fill();
  ctx.fillStyle = LADO[cor];
  rr(ctx, cx - q / 2, cy - q / 2, q, q, q * 0.2);
  ctx.fill();
  ctx.fillStyle = PALETA[cor].cor;
  rr(ctx, cx - q / 2, cy - q / 2, q, q * 0.8, q * 0.2);
  ctx.fill();
  ctx.fillStyle = CLARA[cor];
  rr(ctx, cx - q * 0.32, cy - q * 0.38, q * 0.64, q * 0.14, q * 0.07);
  ctx.fill();
}

function desenharFormiga(ctx: CanvasRenderingContext2D, x: number, y: number, angGraus: number, L: number, cor: number, levando: boolean, fase: number, esc: number, dpr: number) {
  const e = PALETA[cor].escura;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angGraus * Math.PI) / 180);
  ctx.scale(esc, esc);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // sombrinha
  ctx.fillStyle = 'rgba(20, 20, 50, 0.25)';
  ctx.beginPath();
  ctx.ellipse(L * 0.05, L * 0.08, L * 0.25, L * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  // perninhas (mexem)
  ctx.strokeStyle = e;
  ctx.lineWidth = Math.max(1, L * 0.06);
  const bal = Math.sin(fase) * L * 0.1;
  for (const [yy, dx, dy, s] of [
    [-0.08, 0.3, -0.16, 1],
    [-0.02, 0.36, 0.02, -1],
    [0.04, 0.3, 0.2, 1],
  ] as const) {
    for (const lado of [-1, 1]) {
      const jx = lado * L * dx * 0.62;
      const jy = (yy + dy * 0.4) * L - L * 0.04;
      ctx.beginPath();
      ctx.moveTo(lado * L * 0.05, yy * L);
      ctx.lineTo(jx, jy);
      ctx.lineTo(lado * L * dx, (yy + dy) * L + s * bal * lado);
      ctx.stroke();
    }
  }
  const molde = moldeFormiga(cor, L, dpr);
  const S = L * 1.5;
  ctx.drawImage(molde, -S / 2, -S / 2, S, S);
  if (levando) quadradinho(ctx, 0, -L * 0.58, L * 0.36, cor);
  ctx.restore();
}

/** Refaz a camada das formigas e da poeirinha. `frac` (0..1) = quanto do passo seguinte já andou (movimento suave). */
export function desenharCamada(canvas: HTMLCanvasElement, m: Medidas, formigas: Formiga[], particulas: Particula[], frac: number, agora: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, m.Wt, m.Ht);
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const L = Math.max(m.W * 0.07, 26);
  for (const f of formigas) {
    const total = f.acumulado[f.acumulado.length - 1];
    const prog = Math.min(total, f.prog + frac * REGRAS.VELOCIDADE);
    const p = posicaoNoCaminho(f.caminho, f.acumulado, prog);
    const resto = total - prog;
    // encolhe ao entrar no buraco e nasce pequenina ao sair do ninho (para não tampar o número da vaga)
    const esc = f.fase === 'volta' && resto < 0.07 ? Math.max(0.35, resto / 0.07) : f.fase === 'ida' && prog < 0.1 ? Math.max(0.3, prog / 0.1) : 1;
    desenharFormiga(ctx, px(m, p.x), py(m, p.y), p.ang, L, f.cor, f.fase === 'volta', prog * 90, esc, dpr);
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
    const sz = q.s * (1 - t * 0.4);
    const qx = q.x + q.vx * k;
    const qy = q.y + q.vy * k + 14 * k * k * m.W * 0.02;
    quadradinho(ctx, qx, qy, sz, q.cor);
  }
  ctx.globalAlpha = 1;
}

export function limparCamada(canvas: HTMLCanvasElement, m: Medidas) {
  canvas.getContext('2d')!.clearRect(0, 0, m.Wt, m.Ht);
}
