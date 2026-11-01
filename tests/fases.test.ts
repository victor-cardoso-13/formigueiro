import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { novoEstado, podeTocar, rodarAteParar, tocar } from '../src/motor/colonia.ts';
import type { Fase, Grupo } from '../src/motor/tipos.ts';
import { PALETA } from '../src/fases/paleta.ts';
import { DESENHOS_MEDIOS, DESENHOS_PEQUENOS } from '../src/fases/desenhos.ts';

const fases: Fase[] = JSON.parse(readFileSync(new URL('../src/fases/fases.json', import.meta.url), 'utf8'));

const GRUPOS: Record<Grupo, { ids: [number, number]; largura: [number, number]; cores: [number, number] }> = {
  facil: { ids: [1, 10], largura: [24, 36], cores: [3, 4] },
  media: { ids: [11, 30], largura: [30, 40], cores: [4, 6] },
  dificil: { ids: [31, 50], largura: [36, 48], cores: [6, 8] },
  'muito-dificil': { ids: [51, 60], largura: [40, 48], cores: [8, 11] },
};

describe('desenhos à mão', () => {
  it('todas as linhas têm a mesma largura e só usam letras da paleta', () => {
    const letras = PALETA.map((c) => c.letra).join('') + '.';
    for (const d of [...DESENHOS_PEQUENOS, ...DESENHOS_MEDIOS]) {
      expect(new Set(d.linhas.map((l) => l.length)).size, d.nome).toBe(1);
      for (const l of d.linhas) for (const ch of l) expect(letras.includes(ch), `${d.nome}: ${ch}`).toBe(true);
    }
  });
});

describe('as 60 fases congeladas', () => {
  it('ids 1..60 e 10/20/20/10 por grupo', () => {
    expect(fases.map((f) => f.id)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    const cont: Record<string, number> = {};
    for (const f of fases) cont[f.grupo] = (cont[f.grupo] ?? 0) + 1;
    expect(cont).toEqual({ facil: 10, media: 20, dificil: 20, 'muito-dificil': 10 });
    for (const [g, c] of Object.entries(GRUPOS)) for (const f of fases) if (f.id >= c.ids[0] && f.id <= c.ids[1]) expect(f.grupo, `fase ${f.id}`).toBe(g);
  });

  it('os desenhos são todos diferentes entre si', () => {
    expect(new Set(fases.map((f) => f.desenho.join('/'))).size).toBe(fases.length);
    expect(new Set(fases.map((f) => f.nome)).size).toBe(fases.length);
  });

  describe.each(fases.map((f) => [f.id, f.nome, f] as const))('fase %i (%s)', (_id, _nome, f) => {
    it('desenho: tamanho certo, quadro cheio, até 11 cores e dentro da faixa do grupo', () => {
      expect(f.desenho.length).toBe(f.altura);
      for (const l of f.desenho) expect(l.length).toBe(f.largura);
      expect(f.altura).toBeGreaterThanOrEqual(18);
      expect(f.altura).toBeLessThanOrEqual(40);
      const cores = new Set(f.desenho.join(''));
      expect(cores.has('.')).toBe(false); // quadro preenchido (tem cor de fundo)
      expect(cores.size).toBeLessThanOrEqual(PALETA.length);
      for (const c of cores) expect(parseInt(c, 36)).toBeLessThan(PALETA.length);
      const g = GRUPOS[f.grupo];
      expect(f.largura).toBeGreaterThanOrEqual(g.largura[0]);
      expect(f.largura).toBeLessThanOrEqual(g.largura[1]);
      expect(cores.size).toBeGreaterThanOrEqual(g.cores[0]);
      expect(cores.size).toBeLessThanOrEqual(g.cores[1]);
    });

    it('soma dos `n` de cada cor = quadradinhos da cor', () => {
      const quadradinhos = new Map<number, number>();
      for (const l of f.desenho) for (const ch of l) quadradinhos.set(parseInt(ch, 36), (quadradinhos.get(parseInt(ch, 36)) ?? 0) + 1);
      const ninhos = new Map<number, number>();
      for (const n of f.grade.flat()) if (n) ninhos.set(n.cor, (ninhos.get(n.cor) ?? 0) + n.n);
      expect([...ninhos.entries()].sort()).toEqual([...quadradinhos.entries()].sort());
    });

    it('grade: colunas certas, canos só entre vizinhos da mesma linha (grupos de 2 ou 3)', () => {
      const colunas = f.id <= 20 ? 3 : 4;
      for (const linha of f.grade) expect(linha.length).toBe(colunas);
      expect(f.grade.flat().some(Boolean)).toBe(true);
      const grupos = new Map<number, { l: number; c: number }[]>();
      f.grade.forEach((linha, l) =>
        linha.forEach((n, c) => {
          if (n?.g === undefined) return;
          if (!grupos.has(n.g)) grupos.set(n.g, []);
          grupos.get(n.g)!.push({ l, c });
        }),
      );
      for (const [g, lugares] of grupos) {
        expect([2, 3], `g=${g}`).toContain(lugares.length);
        expect(new Set(lugares.map((x) => x.l)).size, `g=${g} na mesma linha`).toBe(1);
        const cs = lugares.map((x) => x.c).sort((a, b) => a - b);
        expect(cs[cs.length - 1] - cs[0], `g=${g} vizinhos`).toBe(cs.length - 1);
        // cores diferentes dentro do mesmo cano
        const cores = lugares.map((x) => f.grade[x.l][x.c]!.cor);
        expect(new Set(cores).size).toBe(cores.length);
      }
      if (f.id <= 10) expect(grupos.size, 'fácil: sem canos').toBe(0);
      if (f.id <= 30) for (const lugares of grupos.values()) expect(lugares.length, 'trios só a partir da fase 31').toBe(2);
    });

    it('replay da solução vence', () => {
      const e = novoEstado(f);
      const total = f.grade.flat().filter(Boolean).length;
      expect(f.solucao.length).toBeGreaterThan(0);
      expect(f.solucao.length).toBeLessThanOrEqual(total);
      for (const id of f.solucao) {
        expect(podeTocar(e, id), `toque ${id}`).toBe(true);
        tocar(e, id);
        rodarAteParar(e);
      }
      expect(e.resultado).toBe('vitoria');
      expect(e.pedacos).toBe(0);
    }, 120000);

    it('taxaAleatoria é uma fração', () => {
      expect(f.taxaAleatoria).toBeGreaterThanOrEqual(0);
      expect(f.taxaAleatoria).toBeLessThanOrEqual(1);
    });
  });
});
