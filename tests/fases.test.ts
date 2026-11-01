import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { novoEstado, origemDe, podeTocar, rodarAteParar, tocar } from '../src/motor/jogo.ts';
import type { Fase } from '../src/motor/tipos.ts';
import { PALETA } from '../src/fases/paleta.ts';
import { DESENHOS_PEQUENOS } from '../src/fases/desenhos.ts';

const fases: Fase[] = JSON.parse(readFileSync(new URL('../src/fases/fases.json', import.meta.url), 'utf8'));

describe('desenhos à mão', () => {
  it('todas as linhas têm a mesma largura e só usam letras da paleta', () => {
    const letras = PALETA.map((c) => c.letra).join('') + '.';
    for (const d of DESENHOS_PEQUENOS) {
      expect(new Set(d.linhas.map((l) => l.length)).size, d.nome).toBe(1);
      for (const l of d.linhas) for (const ch of l) expect(letras.includes(ch), `${d.nome}: ${ch}`).toBe(true);
    }
  });
});

describe('fases congeladas', () => {
  it('existe pelo menos uma fase e os ids são 1..N sem buraco', () => {
    expect(fases.length).toBeGreaterThan(0);
    expect(fases.map((f) => f.id)).toEqual(fases.map((_, i) => i + 1));
  });

  for (const f of fases) {
    describe(`fase ${f.id} (${f.nome})`, () => {
      it('soma das fomes de cada cor = pedacinhos da cor (torrão duro conta 2)', () => {
        const e = novoEstado(f);
        const pedacos = new Map<number, number>();
        for (const l of e.desenho) for (const c of l) if (c) pedacos.set(c.cor, (pedacos.get(c.cor) ?? 0) + c.mordidas);
        const fomes = new Map<number, number>();
        for (const col of f.colunas) for (const a of col) fomes.set(a.cor, (fomes.get(a.cor) ?? 0) + a.fome);
        expect([...fomes.entries()].sort()).toEqual([...pedacos.entries()].sort());
      });

      it('o desenho tem o tamanho dito e só cores da paleta', () => {
        expect(f.desenho.length).toBe(f.altura);
        for (const l of f.desenho) {
          expect(l.length).toBe(f.largura);
          for (const ch of l) if (ch !== '.') expect(parseInt(ch, 36)).toBeLessThan(PALETA.length);
        }
        for (const [x, y] of [...f.folhas, ...f.duros]) expect(f.desenho[y][x]).not.toBe('.');
      });

      it('replay da solução (uma formiga por vez) termina em vitória', () => {
        const e = novoEstado(f);
        for (const t of f.solucao) {
          const o = origemDe(t);
          expect(podeTocar(e, o), `toque ${t}`).toBe(true);
          tocar(e, o);
          rodarAteParar(e);
        }
        expect(e.resultado).toBe('vitoria');
      });

      it('usa de 2 a 5 colunas e a taxa de partidas ao acaso está registrada', () => {
        expect(f.colunas.length).toBeGreaterThanOrEqual(2);
        expect(f.colunas.length).toBeLessThanOrEqual(5);
        expect(f.taxaAleatoria).toBeGreaterThanOrEqual(0);
        expect(f.taxaAleatoria).toBeLessThanOrEqual(1);
      });
    });
  }

  it('contagem por grupo (10/20/20/10 quando completo)', () => {
    const por = (g: string) => fases.filter((f) => f.grupo === g).length;
    if (fases.length === 60) {
      expect([por('facil'), por('media'), por('dificil'), por('muito-dificil')]).toEqual([10, 20, 20, 10]);
    } else {
      expect(por('facil')).toBeLessThanOrEqual(10);
    }
  });
});
