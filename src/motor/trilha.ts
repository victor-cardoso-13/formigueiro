/**
 * A trilha: um anel de células por FORA do desenho (1 célula de distância).
 * Posição 0 = entrada (canto de baixo à esquerda). Depois: sobe pela esquerda (olhando para a direita),
 * anda pelo topo da esquerda para a direita (olhando para baixo), desce pela direita (olhando para a esquerda),
 * anda por baixo da direita para a esquerda (olhando para cima) e chega de novo à entrada.
 * Nos 4 cantos a formiga não olha para nada.
 */
import type { Celula } from './tipos.ts';

export interface PosTrilha {
  /** Coordenadas no mesmo sistema do desenho; fora da grade (-1 ou largura/altura). */
  x: number;
  y: number;
  canto: boolean;
  /** Direção do olhar (para dentro do desenho). */
  dx: number;
  dy: number;
}

const cache = new Map<string, PosTrilha[]>();

/** Tamanho da volta = 2L + 2A + 4 posições. */
export function trilha(largura: number, altura: number): PosTrilha[] {
  const chave = `${largura}x${altura}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const t: PosTrilha[] = [];
  const canto = (x: number, y: number) => t.push({ x, y, canto: true, dx: 0, dy: 0 });
  canto(-1, altura); // 0: entrada
  for (let y = altura - 1; y >= 0; y--) t.push({ x: -1, y, canto: false, dx: 1, dy: 0 }); // sobe pela esquerda
  canto(-1, -1);
  for (let x = 0; x < largura; x++) t.push({ x, y: -1, canto: false, dx: 0, dy: 1 }); // topo
  canto(largura, -1);
  for (let y = 0; y < altura; y++) t.push({ x: largura, y, canto: false, dx: -1, dy: 0 }); // desce pela direita
  canto(largura, altura);
  for (let x = largura - 1; x >= 0; x--) t.push({ x, y: altura, canto: false, dx: 0, dy: -1 }); // embaixo
  cache.set(chave, t);
  return t;
}

/** O primeiro pedacinho não vazio que quem está na posição `p` enxerga (ou null: canto/linha vazia). */
export function alvo(
  desenho: (Celula | null)[][],
  largura: number,
  altura: number,
  p: PosTrilha,
): { x: number; y: number } | null {
  if (p.canto) return null;
  let x = p.x + p.dx;
  let y = p.y + p.dy;
  while (x >= 0 && y >= 0 && x < largura && y < altura) {
    if (desenho[y][x]) return { x, y };
    x += p.dx;
    y += p.dy;
  }
  return null;
}
