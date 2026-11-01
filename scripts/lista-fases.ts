/** A lista das 60 fases: qual desenho, grupo e peças especiais. */
import { DESENHOS_MEDIOS, DESENHOS_PEQUENOS, PRIMAS } from '../src/fases/desenhos.ts';
import { aneis, ampliar, coresN, espiral, ladrilhos, listras, retalhos, vitral, xadrez } from '../src/fases/geradores.ts';
import type { Grupo } from '../src/motor/tipos.ts';
import type { Entrada } from './gerador.ts';

const FAIXAS: Record<number, string> = {
  16: 'Folha seca! Ninguém come o pedacinho debaixo da folha. Ela cai quando um vizinho (em cima, embaixo ou do lado) for comido.',
  41: 'Formiga dorminhoca! Ela dorme (zzz) e não pode sair. Acorda depois que 3 formigas saírem das filas.',
};

const pequeno = (nome: string) => DESENHOS_PEQUENOS.find((d) => d.nome === nome)!.linhas;
const medio = (nome: string) => DESENHOS_MEDIOS.find((d) => d.nome === nome)!.linhas;
const grande = (nome: string, f: number, b = 3, semente = 1) => retalhos(ampliar(pequeno(nome), f), PRIMAS, b, semente);

/** [id, nome, linhas] */
function desenhos(): [number, string, string[]][] {
  return [
    // ---- média (11–30) ----
    [11, 'Abacaxi', medio('Abacaxi')],
    [12, 'Melancia', medio('Melancia')],
    [13, 'Joaninha', medio('Joaninha')],
    [14, 'Listras', listras(12, 12, coresN(3), 2)],
    [15, 'Borboleta', medio('Borboleta')],
    [16, 'Xadrez', xadrez(12, 12, coresN(3, 1), 2)],
    [17, 'Sorvete', medio('Sorvete')],
    [18, 'Losangos', aneis(14, 14, coresN(4), 'losango', 2)],
    [19, 'Girassol', medio('Girassol')],
    [20, 'Vitral', vitral(14, 14, coresN(4, 1), 20, true)],
    [21, 'Coruja', medio('Coruja')],
    [22, 'Tijolinhos', ladrilhos(16, 12, coresN(4, 2), 22)],
    [23, 'Espiral', espiral(14, 14, coresN(4, 3), 3, 3)],
    [24, 'Círculos', aneis(16, 16, coresN(5), 'circulo', 2)],
    [25, 'Vitral II', vitral(16, 16, coresN(5, 1), 25, true)],
    [26, 'Xadrez II', xadrez(14, 14, coresN(5, 2), 2)],
    [27, 'Listras II', listras(16, 16, coresN(5, 3), 3)],
    [28, 'Mosaico', vitral(15, 15, coresN(5, 4), 28, false)],
    [29, 'Tijolinhos II', ladrilhos(16, 14, coresN(5, 1), 29)],
    [30, 'Espiral II', espiral(16, 16, coresN(5, 2), 4, 3)],
    // ---- difícil (31–50) ----
    [31, 'Coração de retalhos', grande('Coração', 2, 1, 31)],
    [32, 'Vitral III', vitral(16, 16, coresN(6), 32, true)],
    [33, 'Mandala', vitral(18, 18, coresN(6, 3), 133, true, 12)],
    [34, 'Espiral III', espiral(18, 18, coresN(6, 2), 3, 3)],
    [35, 'Quadrados', aneis(16, 16, coresN(6, 4), 'quadrado', 1.5)],
    [36, 'Cogumelo de retalhos', grande('Cogumelo', 2, 3, 36)],
    [37, 'Mosaico II', vitral(18, 18, coresN(6, 1), 37, false)],
    [38, 'Tijolinhos III', ladrilhos(20, 16, coresN(6, 3), 38)],
    [39, 'Casinha de retalhos', grande('Casinha', 2, 3, 39)],
    [40, 'Xadrez III', xadrez(18, 18, coresN(7), 2)],
    [41, 'Gato de retalhos', grande('Gato', 2, 3, 41)],
    [42, 'Vitral IV', vitral(18, 18, coresN(7, 2), 42, true)],
    [43, 'Círculos II', aneis(20, 20, coresN(7, 1), 'circulo', 2)],
    [44, 'Espiral IV', espiral(20, 20, coresN(7, 3), 4, 3)],
    [45, 'Listras III', listras(20, 16, coresN(7, 4), 2)],
    [46, 'Mosaico III', vitral(20, 20, coresN(7, 5), 46, false)],
    [47, 'Vitral V', vitral(20, 20, coresN(6, 3), 47, true)],
    [48, 'Tijolinhos IV', ladrilhos(20, 18, coresN(7, 2), 48)],
    [49, 'Losangos II', aneis(20, 20, coresN(6, 5), 'losango', 2)],
    [50, 'Xadrez IV', xadrez(20, 20, coresN(7, 6), 2)],
    // ---- muito difícil (51–60) ----
    [51, 'Barco de retalhos', grande('Barco', 2, 3, 51)],
    [52, 'Vitral VI', vitral(22, 22, coresN(8), 52, true)],
    [53, 'Espiral V', espiral(22, 22, coresN(8, 2), 4, 3)],
    [54, 'Flor de retalhos', grande('Flor', 2, 1, 54)],
    [55, 'Mosaico IV', vitral(22, 22, coresN(8, 4), 55, false)],
    [56, 'Árvore de retalhos', grande('Árvore', 2, 1, 56)],
    [57, 'Círculos III', aneis(24, 24, coresN(9), 'circulo', 2)],
    [58, 'Vitral VII', vitral(24, 24, coresN(9, 3), 58, true)],
    [59, 'Tijolinhos V', ladrilhos(24, 20, coresN(9, 1), 59)],
    [60, 'Espiral VI', espiral(24, 24, coresN(9, 5), 5, 3)],
  ];
}

export function grupoDe(id: number): Grupo {
  return id <= 10 ? 'facil' : id <= 30 ? 'media' : id <= 50 ? 'dificil' : 'muito-dificil';
}

export function entradas(): Entrada[] {
  const lista: Entrada[] = [];
  DESENHOS_PEQUENOS.forEach((d, i) => {
    // fáceis: sobem devagar de dureza
    lista.push({ id: i + 1, grupo: 'facil', nome: d.nome, linhas: d.linhas, semente: 100 + i, dureza: Math.min(0.5, 0.06 * i) });
  });
  for (const [id, nome, linhas] of desenhos()) {
    const dorm = id >= 41;
    lista.push({
      id,
      grupo: grupoDe(id),
      nome,
      linhas,
      semente: 1000 + id * 17,
      especiais: { folha: id >= 16, dorminhoca: dorm },
      faixa: FAIXAS[id],
      param: dorm ? { dorminhocas: id <= 45 ? 2 : id <= 50 ? 3 : 4 } : {},
    });
  }
  return lista;
}
