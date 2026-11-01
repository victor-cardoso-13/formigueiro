import { describe, expect, it } from 'vitest';
import { daNuvem, iguais, mesclar, paraNuvem } from '../src/nuvem/mesclar.ts';
import type { Progresso } from '../src/ui/salvar.ts';

const base = (o: Partial<Progresso> = {}): Progresso => ({
  ajudas: { simbolos: false },
  simbolosEm: 0,
  ganhas: [],
  faseAtual: 1,
  velocidade: 1,
  tutorialVisto: false,
  faixasVistas: [],
  tela: 'inicio',
  ...o,
});

describe('progresso na nuvem', () => {
  it('vai só o que vale para a pessoa (ganhas e símbolos); o resto fica no aparelho', () => {
    const n = paraNuvem(base({ ganhas: [3, 1, 3, 2], velocidade: 3, tela: 'jogo', faseAtual: 7 }));
    expect(n).toEqual({ versao: 1, ganhas: [1, 2, 3], simbolos: false, simbolosEm: 0 });
  });
  it('da nuvem para o aparelho: ganhas e símbolos vêm de lá, velocidade e tela ficam como estavam', () => {
    const local = base({ velocidade: 2, tela: 'mapa', faseAtual: 5 });
    const r = daNuvem({ versao: 1, ganhas: [4, 2], simbolos: true, simbolosEm: 99 }, local);
    expect(r.ganhas).toEqual([2, 4]);
    expect(r.ajudas.simbolos).toBe(true);
    expect(r.velocidade).toBe(2);
    expect(r.tela).toBe('mapa');
    expect(r.faseAtual).toBe(5);
  });
  it('juntar: fases ganhas de qualquer lado valem; nos símbolos vale a mudança mais recente', () => {
    const a = base({ ganhas: [1, 2], ajudas: { simbolos: true }, simbolosEm: 10 });
    const b = base({ ganhas: [2, 3], ajudas: { simbolos: false }, simbolosEm: 20 });
    const j = mesclar(a, b);
    expect(j.ganhas).toEqual([1, 2, 3]);
    expect(j.ajudas.simbolos).toBe(false);
    expect(j.simbolosEm).toBe(20);
    // em empate fica o do aparelho
    expect(mesclar(base({ ajudas: { simbolos: true }, simbolosEm: 5 }), base({ simbolosEm: 5 })).ajudas.simbolos).toBe(true);
  });
  it('não regrava à toa: copias iguais no que vai para a nuvem', () => {
    expect(iguais(base({ ganhas: [1, 2] }), base({ ganhas: [2, 1], velocidade: 3 }))).toBe(true);
    expect(iguais(base({ ganhas: [1] }), base({ ganhas: [1, 2] }))).toBe(false);
  });
});
