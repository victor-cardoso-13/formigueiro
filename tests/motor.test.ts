import { describe, expect, it } from 'vitest';
import { REGRAS } from '../src/motor/regras.ts';
import { alvo, trilha } from '../src/motor/trilha.ts';
import { clonar, novoEstado, passo, podeTocar, previsao, rodarAteParar, tocar } from '../src/motor/jogo.ts';
import { cel, fase } from './ajuda.ts';

const A = { coluna: 0 };

describe('trilha', () => {
  it('tem 2L+2A+4 posições, começa na entrada embaixo à esquerda e tem 4 cantos', () => {
    const t = trilha(3, 3);
    expect(t.length).toBe(16);
    expect(t[0]).toMatchObject({ x: -1, y: 3, canto: true });
    expect(t.filter((p) => p.canto).length).toBe(4);
    expect(t[1]).toMatchObject({ x: -1, y: 2, dx: 1, dy: 0 }); // sobe pela esquerda olhando para a direita
    expect(t[5]).toMatchObject({ x: 0, y: -1, dx: 0, dy: 1 }); // topo olhando para baixo
    expect(t[9]).toMatchObject({ x: 3, y: 0, dx: -1, dy: 0 }); // desce pela direita olhando para a esquerda
    expect(t[13]).toMatchObject({ x: 2, y: 3, dx: 0, dy: -1 }); // embaixo olhando para cima
  });
  it('só vê o primeiro pedacinho da linha', () => {
    const e = novoEstado(fase(['.1.', '...', '...'], [[{ cor: 1, fome: 1 }]]));
    const t = trilha(3, 3);
    expect(alvo(e.desenho, 3, 3, t[3])).toEqual({ x: 1, y: 0 }); // linha 0 pela esquerda
    expect(alvo(e.desenho, 3, 3, t[2])).toBeNull(); // linha 1 vazia
    expect(alvo(e.desenho, 3, 3, t[0])).toBeNull(); // canto
  });
});

describe('uma volta completa numa grade 3x3', () => {
  it('come na ordem do percurso, 1 por passo, e vai para a espera com a fome que sobrou', () => {
    const e = novoEstado(fase(['000', '000', '000'], [[{ cor: 0, fome: 99 }]]));
    expect(tocar(e, A)).not.toBeNull();
    expect(e.trilha[0].pos).toBe(0);
    const comidos: [number, number][] = [];
    let passos = 0;
    while (e.trilha.length) {
      for (const ev of passo(e)) if (ev.tipo === 'comeu') comidos.push([ev.x, ev.y]);
      passos++;
    }
    expect(passos).toBe(16);
    expect(comidos).toEqual([[0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2]]);
    expect(cel(e)).toEqual(['...', '.0.', '...']);
    expect(e.espera[0]?.fome).toBe(91);
    expect(e.pedacos).toBe(1);
  });
  it('no máximo 1 pedacinho por passo', () => {
    const e = novoEstado(fase(['00', '00'], [[{ cor: 0, fome: 9 }]]));
    tocar(e, A);
    const antes = e.pedacos;
    passo(e);
    expect(antes - e.pedacos).toBeLessThanOrEqual(1);
  });
});

describe('o que ela come', () => {
  it('só come a própria cor e NÃO pula para o de trás quando o primeiro é de outra cor', () => {
    const e = novoEstado(fase(['10', '..'], [[{ cor: 0, fome: 5 }]]));
    // Linha 0 pela esquerda: o primeiro é '1' (outra cor); o '0' atrás dele fica escondido.
    tocar(e, A);
    for (let i = 0; i < 4; i++) passo(e); // percorre a esquerda (linhas 1 e 0)
    expect(cel(e)).toEqual(['10', '..']);
    rodarAteParar(e);
    // Pela direita, a linha 0 mostra o '0' primeiro: aí sim come.
    expect(cel(e)).toEqual(['1.', '..']);
  });
  it('fome 0: a formiga vai embora na hora, sem esperar', () => {
    const e = novoEstado(fase(['000', '...', '...'], [[{ cor: 0, fome: 1 }]]));
    tocar(e, A);
    const evs = [];
    while (e.trilha.length) evs.push(...passo(e));
    expect(evs.some((x) => x.tipo === 'foiEmbora')).toBe(true);
    expect(e.espera.every((x) => x === null)).toBe(true);
    expect(e.pedacos).toBe(2);
  });
  it('cantos não comem', () => {
    // Só existe o pedacinho (0,0): pela esquerda (posição 3) ele já seria visto; testamos que no canto (4) nada acontece.
    const e = novoEstado(fase(['0.', '..'], [[{ cor: 0, fome: 9 }]]));
    tocar(e, A);
    e.trilha[0].pos = 2; // última linha antes do canto de cima à esquerda
    passo(e); // posição 3 = canto: não come
    expect(e.pedacos).toBe(1);
  });
});

describe('fim de jogo', () => {
  it('vitória quando o desenho fica vazio', () => {
    const e = novoEstado(fase(['0'], [[{ cor: 0, fome: 1 }]]));
    tocar(e, A);
    rodarAteParar(e);
    expect(e.resultado).toBe('vitoria');
  });
  it('derrota quando a volta acaba com fome e não há lugar de espera', () => {
    const e = novoEstado(fase(['1'], [[{ cor: 0, fome: 1 }]]));
    e.espera = e.espera.map((_, i) => ({ id: 100 + i, cor: 1, fome: 1 }));
    tocar(e, A);
    rodarAteParar(e);
    expect(e.resultado).toBe('derrota');
    expect(e.motivo).toMatch(/onde esperar/);
  });
  it('volta com fome vai para o primeiro lugar de espera livre', () => {
    const e = novoEstado(fase(['1'], [[{ cor: 0, fome: 1 }]]));
    e.espera[0] = { id: 100, cor: 1, fome: 1 };
    tocar(e, A);
    rodarAteParar(e);
    expect(e.espera[1]?.cor).toBe(0);
  });
  it('formiga na espera pode sair de novo', () => {
    const e = novoEstado(fase(['1'], [[{ cor: 0, fome: 1 }]]));
    tocar(e, A);
    rodarAteParar(e);
    expect(e.espera[0]).not.toBeNull();
    expect(podeTocar(e, { espera: 0 })).toBe(true);
    tocar(e, { espera: 0 });
    expect(e.espera[0]).toBeNull();
    expect(e.trilha.length).toBe(1);
  });
});

describe('torrão duro, folha seca', () => {
  it('torrão duro precisa de 2 mordidas', () => {
    const e = novoEstado(fase(['0'], [[{ cor: 0, fome: 2 }]], { duros: [[0, 0]] }));
    tocar(e, A);
    let primeira = -1;
    while (e.trilha.length) {
      const evs = passo(e);
      if (primeira < 0 && evs.some((x) => x.tipo === 'comeu')) {
        primeira = e.passo;
        expect(e.pedacos).toBe(1); // rachou, mas não sumiu
        expect(e.desenho[0][0]?.mordidas).toBe(1);
      }
    }
    expect(e.resultado).toBe('vitoria');
  });
  it('folha seca: ninguém come, tapa a visão e cai quando um vizinho é comido', () => {
    // linha: [0 com folha] [0] ; formiga de cor 0 vendo pela esquerda só enxerga o coberto
    const e = novoEstado(fase(['00', '..'], [[{ cor: 0, fome: 9 }]], { folhas: [[0, 0]] }));
    tocar(e, A);
    for (let i = 0; i < 4; i++) passo(e);
    expect(e.desenho[0][0]?.folha).toBe(true);
    expect(e.pedacos).toBe(2); // a linha 0 pela esquerda mostra o coberto: nada comido
    // pela direita, a linha 0 mostra (1,0): come, e a folha de (0,0) cai
    let caiu = false;
    while (e.trilha.length && !caiu) caiu = passo(e).some((x) => x.tipo === 'folhaCaiu');
    expect(caiu).toBe(true);
    expect(e.desenho[0][0]?.folha).toBe(false);
    expect(e.desenho[0][1]).toBeNull();
  });
});

describe('toques', () => {
  it('entrada ocupada: o toque é ignorado; depois do passo, entra', () => {
    const e = novoEstado(fase(['1'], [[{ cor: 0, fome: 1 }], [{ cor: 0, fome: 1 }]]));
    expect(tocar(e, { coluna: 0 })).not.toBeNull();
    expect(podeTocar(e, { coluna: 1 })).toBe(false);
    expect(tocar(e, { coluna: 1 })).toBeNull();
    passo(e);
    expect(podeTocar(e, { coluna: 1 })).toBe(true);
  });
  it(`com ${REGRAS.MAX_NA_TRILHA} formigas na trilha o toque é ignorado`, () => {
    const cols = Array.from({ length: 6 }, () => [{ cor: 0, fome: 9 }]);
    const e = novoEstado(fase(['1111111111'], cols));
    for (let i = 0; i < 5; i++) {
      expect(tocar(e, { coluna: i })).not.toBeNull();
      passo(e);
    }
    expect(e.trilha.length).toBe(5);
    expect(tocar(e, { coluna: 5 })).toBeNull();
  });
  it('só a primeira de cada coluna sai', () => {
    const e = novoEstado(fase(['1'], [[{ cor: 0, fome: 1 }, { cor: 1, fome: 1 }]]));
    tocar(e, A);
    expect(e.colunas[0].length).toBe(1);
    expect(e.colunas[0][0].cor).toBe(1);
  });
  it('duas formigas veem o mesmo pedacinho no mesmo passo: a que entrou primeiro (à frente) come', () => {
    const e = novoEstado(fase(['0.', '..'], [[{ cor: 0, fome: 1 }], [{ cor: 0, fome: 1 }]]));
    const [a, b] = [e.colunas[0].shift()!, e.colunas[1].shift()!];
    // b entrou antes e está à frente (posição 3 -> 4 vê a coluna 0); a vem atrás (1 -> 2 vê a linha 0): ambos veem (0,0).
    e.trilha = [
      { formiga: b, pos: 3, origem: { coluna: 1 } },
      { formiga: a, pos: 1, origem: { coluna: 0 } },
    ];
    const comeu: number[] = [];
    for (const ev of passo(e)) if (ev.tipo === 'comeu') comeu.push(ev.id);
    expect(comeu).toEqual([b.id]);
  });
});

describe('formiga dorminhoca', () => {
  const cols = () => [
    [{ cor: 0, fome: 1, dorme: true }, { cor: 0, fome: 1 }],
    [{ cor: 0, fome: 1 }],
    [{ cor: 0, fome: 1 }],
    [{ cor: 0, fome: 1 }],
    [{ cor: 0, fome: 1 }],
  ];
  it('não pode ser tocada e acorda depois de 3 saídas de outras colunas (3, 2, 1)', () => {
    const e = novoEstado(fase(['11111111'], cols()));
    expect(e.colunas[0][0].dorme).toBe(3);
    expect(podeTocar(e, { coluna: 0 })).toBe(false);
    tocar(e, { coluna: 1 });
    expect(e.colunas[0][0].dorme).toBe(2);
    passo(e);
    tocar(e, { coluna: 2 });
    expect(e.colunas[0][0].dorme).toBe(1);
    passo(e);
    const evs = tocar(e, { coluna: 3 })!;
    expect(evs.some((x) => x.tipo === 'acordou')).toBe(true);
    expect(e.colunas[0][0].dorme).toBeUndefined();
    passo(e);
    expect(podeTocar(e, { coluna: 0 })).toBe(true);
  });
  it('saída de um lugar de espera não conta', () => {
    const e = novoEstado(fase(['1'], cols()));
    e.espera[0] = { id: 99, cor: 0, fome: 1 };
    tocar(e, { espera: 0 });
    expect(e.colunas[0][0].dorme).toBe(3);
  });
  it('só conta a partir do momento em que chega à frente da coluna', () => {
    const e = novoEstado(
      fase(['11111111'], [
        [{ cor: 0, fome: 1 }, { cor: 0, fome: 1, dorme: true }],
        [{ cor: 0, fome: 1 }],
      ]),
    );
    tocar(e, { coluna: 0 }); // a dorminhoca chega à frente agora: esta saída não conta
    expect(e.colunas[0][0].dorme).toBe(3);
    passo(e);
    tocar(e, { coluna: 1 });
    expect(e.colunas[0][0].dorme).toBe(2);
  });
  it('travado: só sobram dorminhocas na frente e nada na espera', () => {
    const e = novoEstado(fase(['11'], [[{ cor: 0, fome: 1, dorme: true }]]));
    expect(e.resultado).toBe('travado');
  });
});

describe('previsão (👀 N)', () => {
  it('bate com uma volta de verdade', () => {
    const f = fase(['0120', '2010', '1201', '0.12'], [[{ cor: 0, fome: 4 }, { cor: 1, fome: 3 }], [{ cor: 2, fome: 20 }]]);
    for (const origem of [{ coluna: 0 }, { coluna: 1 }]) {
      const e = novoEstado(f);
      const antes = e.pedacos;
      const p = previsao(e, origem);
      const real = clonar(e);
      tocar(real, origem);
      rodarAteParar(real);
      expect(antes - real.pedacos).toBe(p.comeria);
      expect(JSON.stringify(e)).toBe(JSON.stringify(novoEstado(f))); // não mexeu no estado
    }
  });
  it('conta o que só fica à vista depois de comer o da frente, e marca os à vista da cor dela', () => {
    const e = novoEstado(fase(['00', '..'], [[{ cor: 0, fome: 9 }]]));
    const p = previsao(e, A);
    expect(p.comeria).toBe(2);
    expect(p.celulasAVista.length).toBe(2);
  });
});
