import { describe, expect, it } from 'vitest';
import { REGRAS } from '../src/motor/regras.ts';
import { acumular, caminhoIda, caminhoVolta, centroVaga, buraco, posicaoNoCaminho } from '../src/motor/geometria.ts';
import { clonar, expostos, frente, motivoDeNaoPoder, novoEstado, parado, passo, podeTocar, rodarAteParar, tocar, unidade } from '../src/motor/colonia.ts';
import { fase } from './ajuda.ts';

describe('quadradinhos expostos', () => {
  it('só os primeiros de cada linha/coluna vistos de fora; os de trás ficam escondidos', () => {
    // 3x3 cheio de cor 0: expostos = todas as bordas (8 células), o do meio fica escondido
    const e = novoEstado(fase(['000', '000', '000'], [[{ cor: 0, n: 9 }]]));
    const xs = new Set(expostos(e, 0).map((c) => `${c.x},${c.y}`));
    expect(xs.size).toBe(8);
    expect(xs.has('1,1')).toBe(false);
  });
  it('só mostra a cor pedida e depois que o da frente some, o de trás aparece', () => {
    const e = novoEstado(fase(['01', '..'], [[{ cor: 1, n: 1 }]]));
    // linha 0 vista da esquerda: primeiro é a cor 0 (esconde a cor 1); vista da direita: a cor 1 aparece
    const lados = expostos(e, 1).map((c) => c.lado);
    expect(lados).toContain('dir');
    expect(lados).not.toContain('esq');
    e.desenho[0][0] = -1;
    expect(expostos(e, 1).map((c) => c.lado)).toContain('esq');
  });
});

describe('geometria', () => {
  it('o caminho começa na vaga, termina no buraco e passa pelo quadradinho', () => {
    const h = 0.75;
    const ida = caminhoIda(4, h, centroVaga(h, 0), 1, 1, 'esq');
    const volta = caminhoVolta(4, h, 1, 1, 'esq');
    expect(ida[0]).toEqual(centroVaga(h, 0));
    expect(ida[ida.length - 1]).toEqual({ x: 1.5 / 4, y: 1.5 / 4 });
    expect(volta[volta.length - 1]).toEqual(buraco(h));
    const caminho = [...ida, ...volta.slice(1)];
    const ac = acumular(caminho);
    const p0 = posicaoNoCaminho(caminho, ac, 0);
    expect(p0.x).toBeCloseTo(centroVaga(h, 0).x);
    const fim = posicaoNoCaminho(caminho, ac, 999);
    expect(fim.x).toBeCloseTo(buraco(h).x);
    expect(fim.y).toBeCloseTo(buraco(h).y);
  });
  it('o caminho pelo contorno nunca atravessa o quadro (fora das bordas, exceto a entrada final)', () => {
    const h = 1;
    const ida = caminhoIda(4, h, centroVaga(h, 4), 0, 3, 'topo');
    // todos os pontos menos o último ficam fora do quadro (x<0, x>1, y<0 ou y>h)
    for (const p of ida.slice(0, -1)) expect(p.x < 0 || p.x > 1 || p.y < 0 || p.y > h).toBe(true);
  });
});

describe('ninhos e vagas', () => {
  const grade = [
    [{ cor: 0, n: 2 }, { cor: 1, n: 1 }],
    [{ cor: 0, n: 1 }, null],
  ];
  it('só os ninhos da frente de cada coluna podem ser tocados', () => {
    const e = novoEstado(fase(['01', '00'], grade));
    expect(frente(e).map((n) => n.id)).toEqual([1, 2]);
    expect(podeTocar(e, 1)).toBe(true);
    expect(podeTocar(e, 3)).toBe(false);
    expect(motivoDeNaoPoder(e, 3)).toBe('atras');
  });
  it('ao subir, o ninho ocupa a primeira vaga livre e o de trás passa para a frente', () => {
    const e = novoEstado(fase(['01', '00'], grade));
    tocar(e, 1);
    expect(e.vagas[0]?.id).toBe(1);
    expect(frente(e).map((n) => n.id)).toEqual([3, 2]);
  });
  it('ninhos ligados por cano sobem juntos e precisam de vagas livres para todos', () => {
    const f = fase(['012', '012'], [[{ cor: 0, n: 2, g: 1 }, { cor: 1, n: 2, g: 1 }, { cor: 2, n: 2 }]]);
    const e = novoEstado(f);
    expect(unidade(e, 2)!.map((n) => n.id)).toEqual([1, 2]);
    // ocupa 4 vagas: sobra 1 e o grupo (2) não cabe
    for (let i = 0; i < 4; i++) e.vagas[i] = { id: 90 + i, cor: 5, n: 1, restam: 1, espera: 0 };
    expect(motivoDeNaoPoder(e, 1)).toBe('vagas');
    expect(tocar(e, 1)).toBeNull();
    e.vagas[3] = null;
    expect(podeTocar(e, 2)).toBe(true);
    tocar(e, 2);
    expect(e.vagas.filter(Boolean).length).toBe(5);
    expect(e.grade[0][0]).toBeNull();
    expect(e.grade[0][1]).toBeNull();
  });
});

describe('formigas', () => {
  it('uma formiga vai até o quadradinho, pega (ele some) e leva até o buraco', () => {
    const e = novoEstado(fase(['0'], [[{ cor: 0, n: 1 }]]));
    tocar(e, 1);
    const evs = [];
    for (let i = 0; i < 400 && e.resultado === 'jogando'; i++) evs.push(...passo(e));
    const tipos = evs.map((x) => x.tipo);
    expect(tipos.indexOf('saiu')).toBeLessThan(tipos.indexOf('pegou'));
    expect(tipos.indexOf('pegou')).toBeLessThan(tipos.indexOf('entregou'));
    expect(e.resultado).toBe('vitoria');
    expect(e.vagas.every((v) => v === null)).toBe(true);
  });
  it('várias formigas saem do mesmo ninho, uma depois da outra, e o número de formigas que faltam cai', () => {
    const e = novoEstado(fase(['000', '000', '000'], [[{ cor: 0, n: 9 }]]));
    tocar(e, 1);
    const restos: number[] = [];
    let saidas = 0;
    for (let i = 0; i < 60; i++) {
      saidas += passo(e).filter((x) => x.tipo === 'saiu').length;
      if (e.vagas[0]) restos.push(e.vagas[0].restam);
    }
    expect(saidas).toBeGreaterThan(5);
    expect(restos[0]).toBeGreaterThan(restos[restos.length - 1] ?? 0);
    expect(e.formigas.length).toBeGreaterThan(1); // várias ao mesmo tempo
  });
  it('cada quadradinho só é escolhido por uma formiga', () => {
    const e = novoEstado(fase(['00', '00'], [[{ cor: 0, n: 4 }]]));
    tocar(e, 1);
    for (let i = 0; i < 40; i++) passo(e);
    const alvos = e.formigas.map((f) => `${f.alvo.x},${f.alvo.y}`);
    expect(new Set(alvos).size).toBe(alvos.length);
  });
  it('só pega quadradinhos da cor do ninho e só os expostos (o de trás espera o da frente sair)', () => {
    // linha única: 1 0 ; ninho da cor 0 só enxerga o 0 pela direita
    const e = novoEstado(fase(['10'], [[{ cor: 0, n: 1 }, { cor: 1, n: 1 }]]));
    tocar(e, 1);
    rodarAteParar(e);
    expect(e.desenho[0]).toEqual([1, -1]);
    expect(e.pedacos).toBe(1);
  });
  it('ninho cuja cor está escondida espera na vaga e só pega depois que a cor da frente sai', () => {
    // cor 1 escondida no centro de um quadro 3×3 de cor 0
    const e = novoEstado(fase(['000', '010', '000'], [[{ cor: 1, n: 1 }, { cor: 0, n: 8 }]]));
    expect(expostos(e, 1).length).toBe(0);
    tocar(e, 1); // ninho da cor 1: nada para pegar ainda
    for (let i = 0; i < 30; i++) passo(e);
    expect(e.formigas.length).toBe(0);
    expect(e.vagas[0]?.restam).toBe(1); // continua esperando, ocupando a vaga
    tocar(e, 2); // agora o ninho da cor 0 abre caminho
    for (let i = 0; i < 2000 && e.resultado === 'jogando'; i++) passo(e);
    expect(e.resultado).toBe('vitoria');
  });
  it('derrota: vagas cheias de ninhos que não alcançam nada e nada mais pode subir', () => {
    // cor 1 escondida no centro de um quadro 3×3 de cor 0
    const e = novoEstado(fase(['000', '010', '000'], [[{ cor: 1, n: 1 }], [{ cor: 1, n: 1 }], [{ cor: 1, n: 1 }], [{ cor: 1, n: 1 }], [{ cor: 1, n: 1 }], [{ cor: 0, n: 8 }]]));
    // coluna única de 6 ninhos: só o 1º é da frente. Sobem um a um (cada um espera na vaga).
    for (let i = 1; i <= 5; i++) {
      expect(tocar(e, i)).not.toBeNull();
      rodarAteParar(e);
    }
    expect(e.vagas.every((v) => !!v)).toBe(true);
    passo(e);
    expect(e.resultado).toBe('derrota');
    expect(e.motivo).toMatch(/vagas/);
  });
  it('vitória só quando o quadro esvazia e a última formiga entrega', () => {
    const e = novoEstado(fase(['00'], [[{ cor: 0, n: 2 }]]));
    tocar(e, 1);
    let venceuCedo = false;
    for (let i = 0; i < 600 && e.resultado === 'jogando'; i++) {
      passo(e);
      if (e.pedacos === 0 && e.formigas.length > 0 && e.resultado !== 'jogando') venceuCedo = true;
    }
    expect(venceuCedo).toBe(false);
    expect(e.resultado).toBe('vitoria');
  });
});

describe('estado', () => {
  it('é determinístico e dá para clonar (Desfazer)', () => {
    const f = fase(['0011', '0011'], [[{ cor: 0, n: 4 }, { cor: 1, n: 4 }]]);
    const a = novoEstado(f);
    const antes = clonar(a);
    tocar(a, 1);
    for (let i = 0; i < 30; i++) passo(a);
    const b = clonar(antes);
    tocar(b, 1);
    for (let i = 0; i < 30; i++) passo(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(antes.vagas.every((v) => v === null)).toBe(true); // o "antes" não foi mexido
    expect(parado(antes)).toBe(true);
  });
  it(`as constantes da casa: ${REGRAS.VAGAS} vagas`, () => {
    expect(REGRAS.VAGAS).toBe(5);
  });
});
