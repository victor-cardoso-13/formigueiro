/**
 * Geometria do jogo (pura). Coordenadas em "larguras do quadro": o quadro vai de x=0 a 1 e de y=0 a h (h = altura/largura).
 * O buraco fica logo abaixo do quadro; as 5 vagas, mais abaixo. A tela usa as mesmas proporções.
 */
import { REGRAS } from './regras.ts';
import type { Lado, Ponto } from './tipos.ts';

const M = REGRAS.MARGEM;

export const buraco = (h: number): Ponto => ({ x: 0.5, y: h + 0.14 });
/** Centro da vaga i (0..4) — onde o ninho fica e de onde as formigas saem. */
export const centroVaga = (h: number, i: number): Ponto => ({ x: (i + 0.5) / REGRAS.VAGAS, y: h + 0.34 });
/** Altura total da "arena" (quadro + buraco + vagas), em larguras do quadro. */
export const alturaArena = (h: number): number => h + 0.34 + 0.12;

const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Posição ao longo do contorno retangular que rodeia o quadro, no sentido horário a partir do canto de cima à esquerda. */
function pos(h: number, p: Ponto, lado: Lado): number {
  const w = 1 + 2 * M;
  const a = h + 2 * M;
  if (lado === 'topo') return p.x + M;
  if (lado === 'dir') return w + (p.y + M);
  if (lado === 'baixo') return w + a + (1 + M - p.x);
  return 2 * w + a + (h + M - p.y);
}

/** Ponto do contorno, na frente do quadradinho (x,y) visto de `lado`. */
export function pontoEntrada(largura: number, h: number, x: number, y: number, lado: Lado): Ponto {
  const cx = (x + 0.5) / largura;
  const cy = (y + 0.5) / largura;
  if (lado === 'baixo') return { x: cx, y: h + M };
  if (lado === 'topo') return { x: cx, y: -M };
  if (lado === 'esq') return { x: -M, y: cy };
  return { x: 1 + M, y: cy };
}

export const centroCelula = (largura: number, x: number, y: number): Ponto => ({ x: (x + 0.5) / largura, y: (y + 0.5) / largura });

/** Caminho pelo contorno entre dois pontos do contorno (pelo lado mais curto). Inclui o ponto final, não o inicial. */
function contorno(h: number, a: Ponto, la: Lado, b: Ponto, lb: Lado): Ponto[] {
  const w = 1 + 2 * M;
  const alt = h + 2 * M;
  const total = 2 * w + 2 * alt;
  const sa = pos(h, a, la);
  const sb = pos(h, b, lb);
  const cantos: { s: number; p: Ponto }[] = [
    { s: 0, p: { x: -M, y: -M } },
    { s: w, p: { x: 1 + M, y: -M } },
    { s: w + alt, p: { x: 1 + M, y: h + M } },
    { s: 2 * w + alt, p: { x: -M, y: h + M } },
  ];
  const mod = (v: number) => ((v % total) + total) % total;
  const horario = mod(sb - sa);
  const sentidoHorario = horario <= total / 2;
  const alcance = sentidoHorario ? horario : total - horario;
  const pts: Ponto[] = cantos
    .map((c) => ({ d: sentidoHorario ? mod(c.s - sa) : mod(sa - c.s), p: c.p }))
    .filter((c) => c.d > 1e-9 && c.d < alcance - 1e-9)
    .sort((q, r) => q.d - r.d)
    .map((c) => c.p);
  pts.push(b);
  return pts;
}

function comprimento(pts: Ponto[]): number {
  let t = 0;
  for (let i = 1; i < pts.length; i++) t += dist(pts[i - 1], pts[i]);
  return t;
}

/** Caminho de ida: da vaga até o contorno, pelo contorno até a frente do quadradinho, e para dentro até o centro dele. */
export function caminhoIda(largura: number, h: number, origem: Ponto, x: number, y: number, lado: Lado): Ponto[] {
  const base: Ponto = { x: Math.min(1, Math.max(0, origem.x)), y: h + M };
  const entrada = pontoEntrada(largura, h, x, y, lado);
  const pts: Ponto[] = [origem, base];
  pts.push(...contorno(h, base, 'baixo', entrada, lado));
  pts.push(centroCelula(largura, x, y));
  return pts;
}

/** Caminho de volta: do quadradinho para fora, pelo contorno até embaixo e até o buraco. */
export function caminhoVolta(largura: number, h: number, x: number, y: number, lado: Lado): Ponto[] {
  const entrada = pontoEntrada(largura, h, x, y, lado);
  const bu = buraco(h);
  const base: Ponto = { x: bu.x, y: h + M };
  const pts: Ponto[] = [entrada];
  pts.push(...contorno(h, entrada, lado, base, 'baixo'));
  pts.push(bu);
  return pts;
}

/** Comprimento da ida (para escolher o quadradinho mais perto). */
export function comprimentoIda(largura: number, h: number, origem: Ponto, x: number, y: number, lado: Lado): number {
  return comprimento(caminhoIda(largura, h, origem, x, y, lado));
}

/** Posição e direção (graus; 0 = para cima) de quem andou `prog` ao longo do caminho. */
export function posicaoNoCaminho(caminho: Ponto[], acumulado: number[], prog: number): { x: number; y: number; ang: number } {
  const total = acumulado[acumulado.length - 1];
  const p = Math.min(Math.max(prog, 0), total);
  let i = 1;
  while (i < acumulado.length - 1 && acumulado[i] < p) i++;
  const a = caminho[i - 1];
  const b = caminho[i];
  const seg = acumulado[i] - acumulado[i - 1] || 1;
  const t = (p - acumulado[i - 1]) / seg;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { x: a.x + dx * t, y: a.y + dy * t, ang: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

export function acumular(pts: Ponto[]): number[] {
  const ac = [0];
  for (let i = 1; i < pts.length; i++) ac.push(ac[i - 1] + dist(pts[i - 1], pts[i]));
  return ac;
}
