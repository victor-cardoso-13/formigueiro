/**
 * Converte o progresso para o formato da nuvem (e de volta) e junta duas cópias
 * (a do aparelho e a da nuvem) quando a pessoa joga em mais de um aparelho.
 * Não usa o Firebase: dá para testar sem internet.
 *
 * Vai para a nuvem só o que vale para a pessoa: as fases ganhas e os símbolos nas cores.
 * Velocidade, tela atual e "já viu o tutorial" ficam em cada aparelho.
 */
import type { Progresso } from '../ui/salvar.ts';

export interface DadosNuvem {
  versao: 1;
  ganhas: number[];
  simbolos: boolean;
  simbolosEm: number;
}

const ordenadas = (v: number[]) => [...new Set(v)].sort((a, b) => a - b);

export function paraNuvem(p: Progresso): DadosNuvem {
  return { versao: 1, ganhas: ordenadas(p.ganhas), simbolos: p.ajudas.simbolos, simbolosEm: p.simbolosEm ?? 0 };
}

/** Põe o que veio da nuvem em cima do progresso do aparelho (o que não vai para a nuvem fica como está). */
export function daNuvem(d: DadosNuvem, base: Progresso): Progresso {
  return {
    ...base,
    ganhas: ordenadas(Array.isArray(d.ganhas) ? d.ganhas.filter((n) => typeof n === 'number') : []),
    ajudas: { ...base.ajudas, simbolos: !!d.simbolos },
    simbolosEm: typeof d.simbolosEm === 'number' ? d.simbolosEm : 0,
  };
}

/** Junta duas cópias: fases ganhas de qualquer uma valem; nos símbolos vale a mudança mais recente. Em empate fica o "a" (o aparelho). */
export function mesclar(a: Progresso, b: Progresso): Progresso {
  const deB = (b.simbolosEm ?? 0) > (a.simbolosEm ?? 0);
  return {
    ...a,
    ganhas: ordenadas([...a.ganhas, ...b.ganhas]),
    ajudas: { ...a.ajudas, simbolos: deB ? b.ajudas.simbolos : a.ajudas.simbolos },
    simbolosEm: Math.max(a.simbolosEm ?? 0, b.simbolosEm ?? 0),
  };
}

/** As duas cópias já são iguais (no que vai para a nuvem)? Evita gravar à toa. */
export const iguais = (a: Progresso, b: Progresso) => JSON.stringify(paraNuvem(a)) === JSON.stringify(paraNuvem(b));
