import { describe, expect, it } from 'vitest';
import { REGRAS } from '../src/motor/regras.ts';
import { acumular, centroVaga, buraco, posicaoNoCaminho } from '../src/motor/geometria.ts';
import { clonar, expostos, frente, vagasLivres, motivoDeNaoPoder, novoEstado, parado, passo, podeTocar, rodarAteParar, tocar, unidade } from '../src/motor/colonia.ts';
import { fase } from './ajuda.ts';

describe('quadradinhos expostos', () => {
  it('exposto = encosta num espaço vazio ligado ao lado de fora; os cercados ficam escondidos', () => {
    // 3x3 cheio de cor 0: expostos = todas as bordas (8 células), o do meio fica escondido
    const e = novoEstado(fase(['000', '000', '000'], [[{ cor: 0, n: 9 }]]));
    const xs = new Set(expostos(e, 0).map((c) => `${c.x},${c.y}`));
    expect(xs.size).toBe(8);
    expect(xs.has('1,1')).toBe(false);
  });
  it('o que aparece quando o de fora sai: vale também o vizinho de lado, não só a linha reta', () => {
    const e = novoEstado(fase(['01', '00'], [[{ cor: 1, n: 1 }]]));
    expect(expostos(e, 1).length).toBe(1); // o 1 está na borda do quadro
    const f = novoEstado(fase(['000', '010', '000'], [[{ cor: 1, n: 1 }]]));
    expect(expostos(f, 1).length).toBe(0);
    f.desenho[1][0] = -1; // abriu um buraco ao lado
    expect(expostos(f, 1).length).toBe(1);
  });
  it('túnel: quadradinho cuja linha reta está tapada, mas que encosta numa caverna aberta para fora', () => {
    // o 1 em (1,1): em cima, embaixo e à esquerda tem 0; à direita há vazios (2,1),(3,1) que descem até a borda de baixo
    const e = novoEstado(fase(['00000', '01..0', '000.0'], [[{ cor: 1, n: 1 }]]));
    expect(e.desenho[1]).toEqual([0, 1, -1, -1, 0]);
    expect(expostos(e, 1).map((c) => `${c.x},${c.y}`)).toEqual(['1,1']);
  });
  it('cavidade fechada (sem ligação com o lado de fora) não conta', () => {
    const e = novoEstado(fase(['00000', '0.2.0', '00000'], [[{ cor: 2, n: 1 }]]));
    expect(expostos(e, 2).length).toBe(0);
  });
});

describe('geometria', () => {
  it('o caminho começa na vaga, passa pelo buraco, chega ao quadradinho e volta ao buraco', () => {
    const e = novoEstado(fase(['0000', '0000', '0000', '0000'], [[{ cor: 0, n: 16 }]]));
    tocar(e, 1);
    passo(e);
    const f = e.formigas[0];
    expect(f.caminho[0]).toEqual(centroVaga(e.h, 0));
    expect(f.caminho[1]).toEqual(buraco(e.h));
    expect(f.caminho[f.caminho.length - 1]).toEqual(buraco(e.h));
    const ac = acumular(f.caminho);
    const p0 = posicaoNoCaminho(f.caminho, ac, 0);
    expect(p0.x).toBeCloseTo(centroVaga(e.h, 0).x);
    const fim = posicaoNoCaminho(f.caminho, ac, 999);
    expect(fim.x).toBeCloseTo(buraco(e.h).x);
    expect(fim.y).toBeCloseTo(buraco(e.h).y);
    // no ponto de pegar, ela está no centro do quadradinho
    const pega = posicaoNoCaminho(f.caminho, ac, f.compIda);
    expect(pega.x).toBeCloseTo((f.alvo.x + 0.5) / 4);
    expect(pega.y).toBeCloseTo((f.alvo.y + 0.5) / 4);
  });
  it('a formiga anda pelos espaços vazios: dentro do quadro só passa por células vazias', () => {
    const e = novoEstado(fase(['00000', '01..0', '000.0'], [[{ cor: 1, n: 1 }]]));
    tocar(e, 1);
    passo(e);
    const f = e.formigas[0];
    expect(f.alvo).toEqual({ x: 1, y: 1 });
    const ida = f.caminho.slice(0, f.caminho.findIndex((_, i) => i > 0 && f.acumulado[i] >= f.compIda) + 1);
    for (const p of ida.slice(2, -1)) {
      const cx = Math.floor(p.x * 5);
      const cy = Math.floor(p.y * 5);
      if (cx >= 0 && cx < 5 && cy >= 0 && cy < 3) expect(e.desenho[cy][cx]).toBe(-1);
    }
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
    let juntas = 0;
    for (let i = 0; i < 150; i++) {
      juntas = Math.max(juntas, e.formigas.length);
      saidas += passo(e).filter((x) => x.tipo === 'saiu').length;
      if (e.vagas[0]) restos.push(e.vagas[0].restam);
    }
    expect(saidas).toBeGreaterThan(5);
    expect(restos[0]).toBeGreaterThan(restos[restos.length - 1] ?? 0);
    expect(juntas).toBeGreaterThan(1); // várias ao mesmo tempo
  });
  it('ninhos ligados por cano só liberam as vagas juntos, quando todos terminaram', () => {
    const e = novoEstado(fase(['0000', '1111', '1111', '1111'], [[{ cor: 0, n: 1, g: 1 }, { cor: 1, n: 12, g: 1 }]]));
    tocar(e, 1);
    expect(e.vagas.filter(Boolean).length).toBe(2);
    for (let i = 0; i < 30; i++) passo(e);
    expect(e.vagas[1]?.restam).toBeGreaterThan(0); // o 2º ainda tem formigas
    expect(e.vagas[0]?.restam).toBe(0); // o 1º já mandou a única formiga...
    expect(e.vagas[0]).not.toBeNull(); // ...mas fica na vaga esperando o outro
    rodarAteParar(e);
    expect(e.vagas.every((v) => v === null)).toBe(true);
  });
  it('come de baixo para cima e, em cada fileira, da esquerda para a direita', () => {
    const e = novoEstado(fase(['000', '000', '000'], [[{ cor: 0, n: 9 }]]));
    tocar(e, 1);
    const ordem: string[] = [];
    for (let i = 0; i < 40 && ordem.length < 3; i++) {
      passo(e);
      for (const f of e.formigas) if (!ordem.includes(`${f.alvo.x},${f.alvo.y}`)) ordem.push(`${f.alvo.x},${f.alvo.y}`);
    }
    expect(ordem).toEqual(['0,2', '1,2', '2,2']);
  });
  it('no máximo 10 formigas de um ninho indo comer; a próxima sai quando uma pega', () => {
    const e = novoEstado(fase(Array.from({ length: 6 }, () => '0'.repeat(30)), [[{ cor: 0, n: 180 }]]));
    tocar(e, 1);
    let maior = 0;
    let pegou = 0;
    for (let i = 0; i < 300; i++) {
      pegou += passo(e).filter((x) => x.tipo === 'pegou').length;
      const indo = e.formigas.filter((f) => f.fase === 'ida').length;
      maior = Math.max(maior, indo);
    }
    expect(maior).toBeGreaterThan(5); // sai uma leva
    expect(maior).toBeLessThanOrEqual(10);
    expect(pegou).toBeGreaterThan(10); // saíram mais formigas depois da primeira leva
  });
  it('ninhos ligados por cano sempre ficam lado a lado nas vagas (as vagas se reorganizam)', () => {
    const e = novoEstado(fase(['0000'], [[{ cor: 0, n: 1 }, { cor: 0, n: 1 }, { cor: 0, n: 1 }, { cor: 0, n: 1, g: 1 }, { cor: 0, n: 1, g: 1 }]]));
    tocar(e, 1);
    tocar(e, 2);
    tocar(e, 3);
    e.vagas[1] = null; // o do meio terminou: sobra um buraco entre os outros
    e.vagas[3] = null;
    expect(e.vagas.map((v) => v?.id ?? 0)).toEqual([1, 0, 3, 0, 0]);
    tocar(e, 4);
    const lugares = e.vagas.map((v, i) => (v && v.grupo === 1 ? i : -1)).filter((i) => i >= 0);
    expect(lugares.length).toBe(2);
    expect(lugares[1] - lugares[0]).toBe(1);
  });
  it('cano em pilha: o da frente e o de trás, na mesma coluna, sobem juntos', () => {
    const e = novoEstado(fase(['0000'], [[{ cor: 0, n: 1, g: 1 }, { cor: 0, n: 1 }], [{ cor: 0, n: 1, g: 1 }, { cor: 0, n: 1 }]]));
    expect(podeTocar(e, 1)).toBe(true);
    tocar(e, 1);
    expect(e.vagas.filter(Boolean).map((v) => v!.id).sort()).toEqual([1, 3]);
    expect(vagasLivres(e)).toBe(3);
  });
  it('cano lado a lado só vai quando todos estão na frente; ligado escondido em outra coluna trava', () => {
    // ninho 1 (frente, coluna 0) ligado ao 4 (coluna 1, atrás do 2): o 2 está na frente dele
    const e = novoEstado(fase(['0000'], [[{ cor: 0, n: 1, g: 1 }, { cor: 0, n: 1 }], [{ cor: 0, n: 1 }, { cor: 0, n: 1, g: 1 }]]));
    expect(podeTocar(e, 1)).toBe(false);
    expect(motivoDeNaoPoder(e, 1)).toBe('atras');
    tocar(e, 2); // o 2 sai da frente
    rodarAteParar(e);
    expect(podeTocar(e, 1)).toBe(true);
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
