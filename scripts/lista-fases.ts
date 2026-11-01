/** A lista das 70 fases (fácil 10, médio 10, difícil 20, desafio 30): qual imagem, grupo e parâmetros do planejamento. */
import { DESENHOS_MEDIOS, DESENHOS_PEQUENOS, PRIMAS } from '../src/fases/desenhos.ts';
import {
  aneis, ampliar, arlequim, comFundo, coresN, chevron, coresUsadas, espiral, ladrilhos, listras, molduras, retalhos, tartan, vitral, xadrez, zigzag,
} from '../src/fases/geradores.ts';
import type { Grupo } from '../src/motor/tipos.ts';
import type { Entrada, Parametros } from './gerador.ts';

export const pequeno = (nome: string) => DESENHOS_PEQUENOS.find((d) => d.nome === nome)!.linhas;
export const medio = (nome: string) => DESENHOS_MEDIOS.find((d) => d.nome === nome)!.linhas;

/** Fundos que podem aparecer atrás de um desenho (o 1º que não estiver no desenho). */
const FUNDOS = ['c', 'b', 'p', 'g', 'k', 'o', 'y', 'm', 'w', 'd', 'r'];
function fundo(linhas: string[], preferido?: string): string {
  const usadas = coresUsadas(linhas);
  if (preferido && !usadas.includes(preferido)) return preferido;
  return FUNDOS.find((c) => !usadas.includes(c))!;
}

/** Desenho à mão: fundo + borda de `pad` + ampliação `f`; `retal` = tamanho do bloco de retalhos (0 = sem). */
export function desenho(linhas: string[], f: number, opc: { pad?: number; fundo?: string; retal?: number; semente?: number; primas?: Record<string, string[]> } = {}): string[] {
  let l = linhas;
  if (opc.retal) l = retalhos(ampliar(l, f), opc.primas ?? PRIMAS, opc.retal, opc.semente ?? 1);
  else l = ampliar(l, f);
  const bg = fundo(l, opc.fundo);
  // a borda de fundo entra DEPOIS de ampliar (pad em quadradinhos finais = pad × f)
  return comFundo(l, bg, (opc.pad ?? 0) * f);
}

type Item = [id: number, nome: string, linhas: string[]];

function imagens(): Item[] {
  return [
    // ---- fácil (1–10): desenhos pequenos ampliados 3× ----
    [1, 'Coração', desenho(pequeno('Coração'), 3, { fundo: 'c' })],
    [2, 'Estrela', desenho(pequeno('Estrela'), 3, { fundo: 'b' })],
    [3, 'Peixe', desenho(pequeno('Peixe'), 3, { fundo: 'g' })],
    [4, 'Cogumelo', desenho(pequeno('Cogumelo'), 3, { fundo: 'b' })],
    [5, 'Casinha', desenho(pequeno('Casinha'), 3, { fundo: 'c' })],
    [6, 'Balão', desenho(pequeno('Balão'), 3, { fundo: 'c' })],
    [7, 'Flor', desenho(pequeno('Flor'), 3, { fundo: 'p' })],
    [8, 'Árvore', desenho(pequeno('Árvore'), 3, { fundo: 'c' })],
    [9, 'Gato', desenho(pequeno('Gato'), 3, { fundo: 'o' })],
    [10, 'Barco', desenho(pequeno('Barco'), 3, { fundo: 'c' })],
    // ---- média (11–30) ----
    [11, 'Abacaxi', desenho(medio('Abacaxi'), 3, { fundo: 'c' })],
    [12, 'Melancia', desenho(medio('Melancia'), 2, { pad: 2, fundo: 'y' })],
    [13, 'Listras', listras(32, 24, coresN(4), 4)],
    [14, 'Joaninha', desenho(medio('Joaninha'), 2, { pad: 2, fundo: 'g' })],
    [15, 'Losangos', aneis(34, 34, coresN(5, 1), 'losango', 3.5)],
    [16, 'Borboleta', desenho(medio('Borboleta'), 2, { pad: 2, fundo: 'c' })],
    [17, 'Arlequim', arlequim(32, 32, coresN(5, 2), 8)],
    [18, 'Sorvete', desenho(medio('Sorvete'), 2, { pad: 2, fundo: 'c' })],
    [19, 'Vitral', vitral(36, 26, coresN(5), 19, true, 18)],
    [20, 'Girassol', desenho(medio('Girassol'), 2, { pad: 2, fundo: 'c' })],
    [21, 'Coruja', desenho(medio('Coruja'), 2, { pad: 3, fundo: 'g' })],
    [22, 'Tijolinhos', ladrilhos(40, 28, coresN(5, 2), 22, 5, 3)],
    [23, 'Alvo', aneis(36, 36, coresN(5, 1), 'quadrado', 3.5)],
    [24, 'Círculos', aneis(36, 36, coresN(5, 3), 'circulo', 3)],
    [25, 'Molduras', molduras(36, 30, coresN(5, 4), 3)],
    [26, 'Xadrez', xadrez(36, 28, coresN(5, 2), 4)],
    [27, 'Xadrez escocês', tartan(36, 36, coresN(6), [[0, 3], [1, 2], [2, 5], [3, 2], [4, 4], [5, 2]])],
    [28, 'Zigue-zague', zigzag(40, 28, coresN(5, 3), 10, 4)],
    [29, 'Mosaico', vitral(38, 30, coresN(6, 4), 28, false, 20)],
    [30, 'Redemoinho', espiral(36, 36, coresN(6, 2), 3, 4)],
    // ---- difícil (31–50) ----
    [31, 'Coração de retalhos', desenho(pequeno('Coração'), 4, { pad: 1, retal: 2, semente: 31 })],
    [32, 'Mandala', vitral(40, 32, coresN(7, 3), 133, true, 22)],
    [33, 'Espiral', espiral(40, 40, coresN(7, 2), 4, 4)],
    [34, 'Cogumelo de retalhos', desenho(pequeno('Cogumelo'), 4, { retal: 2, semente: 34 })],
    [35, 'Quadrados', aneis(40, 32, coresN(7, 4), 'quadrado', 2.5)],
    [36, 'Molduras II', molduras(44, 32, coresN(7, 1), 2.5)],
    [37, 'Casinha de retalhos', desenho(pequeno('Casinha'), 4, { retal: 2, semente: 37 })],
    [38, 'Losangos II', aneis(44, 36, coresN(7, 3), 'losango', 3)],
    [39, 'Xadrez II', xadrez(40, 32, coresN(7, 5), 4)],
    [40, 'Gato de retalhos', desenho(pequeno('Gato'), 4, { retal: 2, semente: 40 })],
    [41, 'Arlequim II', arlequim(40, 40, coresN(7, 1), 10)],
    [42, 'Alvo II', aneis(40, 30, coresN(7, 2), 'quadrado', 2)],
    [43, 'Círculos II', aneis(40, 40, coresN(8, 1), 'circulo', 2.5)],
    [44, 'Redemoinho II', espiral(44, 36, coresN(8, 3), 5, 4)],
    [45, 'Zigue-zague II', zigzag(44, 30, coresN(7, 4), 12, 3)],
    [46, 'Mandala II', vitral(48, 36, coresN(8, 5), 46, true, 26)],
    [47, 'Setas II', chevron(44, 32, coresN(8, 2), 3)],
    [48, 'Xadrez escocês II', tartan(40, 40, coresN(7, 2), [[0, 2], [1, 3], [2, 2], [3, 4], [4, 2], [5, 3], [6, 2]])],
    [49, 'Anéis', aneis(44, 36, coresN(7, 4), 'circulo', 2.6)],
    [50, 'Peixe de retalhos', desenho(pequeno('Peixe'), 4, { retal: 2, semente: 50 })],
    // ---- muito difícil (51–60) ----
    [51, 'Barco de retalhos', desenho(pequeno('Barco'), 4, { retal: 2, semente: 51 })],
    [52, 'Mandala III', vitral(48, 36, coresN(9), 52, true, 20)],
    [53, 'Redemoinho III', espiral(48, 40, coresN(9, 2), 5, 3.5)],
    [54, 'Mandala V', vitral(44, 40, coresN(8, 3), 154, true, 22)],
    [55, 'Mosaico III', vitral(48, 40, coresN(9, 4), 55, false, 22)],
    [56, 'Tijolinhos III', ladrilhos(48, 36, coresN(9, 1), 56, 6, 3)],
    [57, 'Círculos III', aneis(40, 40, coresN(9, 5), 'circulo', 2)],
    [58, 'Mandala IV', vitral(48, 40, coresN(10, 1), 58, true, 24)],
    [59, 'Coruja de retalhos', desenho(medio('Coruja'), 3, { retal: 3, semente: 59 })],
    [60, 'Redemoinho IV', espiral(48, 40, coresN(11), 6, 3)],
    // ---- desafio extra (61–80): retalhos de desenhos, mandalas e padrões com muitas cores ----
    [61, 'Estrela de retalhos', desenho(pequeno('Estrela'), 4, { retal: 2, semente: 61 })],
    [62, 'Flor de retalhos', desenho(pequeno('Flor'), 4, { retal: 2, semente: 62 })],
    [63, 'Árvore de retalhos', desenho(pequeno('Árvore'), 4, { retal: 2, semente: 63 })],
    [64, 'Balão de retalhos', desenho(pequeno('Balão'), 4, { retal: 2, semente: 64 })],
    [65, 'Abacaxi de retalhos', desenho(medio('Abacaxi'), 3, { retal: 3, semente: 65 })],
    [66, 'Melancia de retalhos', desenho(medio('Melancia'), 3, { retal: 3, semente: 66 })],
    [67, 'Joaninha de retalhos', desenho(medio('Joaninha'), 3, { retal: 3, semente: 67 })],
    [68, 'Borboleta de retalhos', desenho(medio('Borboleta'), 3, { retal: 3, semente: 68 })],
    [69, 'Sorvete de retalhos', desenho(medio('Sorvete'), 3, { retal: 3, semente: 69 })],
    [70, 'Girassol de retalhos', desenho(medio('Girassol'), 3, { retal: 3, semente: 70 })],
    [71, 'Mandala VI', vitral(48, 40, coresN(10, 2), 71, true, 24)],
    [72, 'Mandala VII', vitral(44, 40, coresN(9, 5), 72, true, 20)],
    [73, 'Redemoinho V', espiral(48, 40, coresN(10, 3), 5, 3)],
    [74, 'Redemoinho VI', espiral(44, 40, coresN(9, 1), 6, 3)],
    [75, 'Mosaico IV', vitral(48, 40, coresN(10, 4), 75, false, 20)],
    [76, 'Círculos IV', aneis(44, 40, coresN(10, 2), 'circulo', 2)],
    [77, 'Tijolinhos IV', ladrilhos(48, 40, coresN(10, 2), 77, 6, 3)],
    [78, 'Alvo III', aneis(44, 36, coresN(9, 3), 'quadrado', 2)],
    [79, 'Losangos III', aneis(48, 40, coresN(10, 4), 'losango', 2.5)],
    [80, 'Molduras III', molduras(48, 36, coresN(9, 2), 2)],
  ];
}

/**
 * Os 4 níveis (como no Miaudoku). Cada nível lista as imagens ("id de imagem" = o número na lista acima) na ordem em que
 * aparecem para o jogador; o id final da fase é 1, 2, 3… em sequência (fácil, médio, difícil, desafio).
 */
const NIVEIS: { grupo: Grupo; imagens: number[] }[] = [
  { grupo: 'facil', imagens: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { grupo: 'medio', imagens: [11, 13, 15, 17, 19, 21, 23, 25, 27, 29] },
  { grupo: 'dificil', imagens: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
  {
    grupo: 'desafio',
    imagens: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80],
  },
];

/** Parâmetros-base do planejamento por nível (o gerador ajusta se a taxa do robô ficar fora da faixa). */
export function parametrosDe(grupo: Grupo, img: number): Parametros {
  if (grupo === 'facil') return { tamMin: 15, tamMax: 40, pPar: 0, pTrio: 0, mistura: 0 };
  if (grupo === 'medio') return { tamMin: 10, tamMax: 40, pPar: 0.2, pTrio: 0, mistura: 0.2 };
  if (grupo === 'dificil') return { tamMin: 6, tamMax: 45, pPar: 0.3, pTrio: img >= 31 ? 0.1 : 0, mistura: 0.4 };
  return { tamMin: 6, tamMax: 50, pPar: 0.35, pTrio: 0.2, mistura: 0.7 };
}

/** Imagens em que a 1ª semente não chegou na faixa: tenta outra. */
const OUTRA_SEMENTE: Record<number, number> = { 11: 5000, 13: 5000, 14: 2000, 16: 1000, 26: 5000, 29: 5000, 46: 1000, 50: 5000, 53: 5000 };

export function entradas(): Entrada[] {
  const porImagem = new Map(imagens().map(([id, nome, linhas]) => [id, { nome, linhas }]));
  const r: Entrada[] = [];
  let id = 0;
  for (const nivel of NIVEIS) {
    for (const img of nivel.imagens) {
      id++;
      const { nome, linhas } = porImagem.get(img)!;
      r.push({
        id,
        grupo: nivel.grupo,
        nome,
        linhas,
        colunas: nivel.grupo === 'facil' || nivel.grupo === 'medio' ? 3 : 4,
        semente: 1000 + img * 31 + (OUTRA_SEMENTE[img] ?? 0),
        param: parametrosDe(nivel.grupo, img),
        partidas: 60,
      });
    }
  }
  return r;
}
