/**
 * Geometria do jogo (pura). Coordenadas em "larguras do quadro": o quadro vai de x=0 a 1 e de y=0 a h (h = altura/largura).
 * O buraco fica logo abaixo do quadro; as 5 vagas, mais abaixo. A tela usa as mesmas proporções.
 */
import { REGRAS } from './regras.ts';
import type { Ponto } from './tipos.ts';

const M = REGRAS.MARGEM;

export const buraco = (h: number): Ponto => ({ x: 0.5, y: h + 0.14 });
/** Centro da vaga i (0..4) — onde o ninho fica e de onde as formigas saem. */
export const centroVaga = (h: number, i: number): Ponto => ({ x: (i + 0.5) / REGRAS.VAGAS, y: h + 0.34 });
/** Altura total da "arena" (quadro + buraco + vagas), em larguras do quadro. */
export const alturaArena = (h: number): number => h + 0.34 + 0.12;

const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Centro da célula (cx,cy) do quadro; a "volta" de fora (cx=-1, cx=L, cy=-1, cy=A) fica na margem em volta do quadro. */
export function pontoDaCelula(largura: number, altura: number, cx: number, cy: number): Ponto {
  const h = altura / largura;
  const x = cx < 0 ? -M : cx >= largura ? 1 + M : (cx + 0.5) / largura;
  const y = cy < 0 ? -M : cy >= altura ? h + M : (cy + 0.5) / largura;
  return { x, y };
}

export const centroCelula = (largura: number, x: number, y: number): Ponto => ({ x: (x + 0.5) / largura, y: (y + 0.5) / largura });

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
