/**
 * Guarda o progresso no próprio aparelho (localStorage). Sem conta, sem nuvem.
 * Se um dia as fases forem recriadas, troque o "v1" da chave.
 */
const CHAVE = 'formigueiro:v1';

export type Velocidade = 1 | 2 | 5;
export type TelaSalva = 'inicio' | 'mapa' | 'jogo';

export interface Progresso {
  ganhas: number[];
  faseAtual: number;
  velocidade: Velocidade;
  tutorialVisto: boolean;
  faixasVistas: number[];
  tela: TelaSalva;
}

const PADRAO: Progresso = { ganhas: [], faseAtual: 1, velocidade: 1, tutorialVisto: false, faixasVistas: [], tela: 'inicio' };

let cache: Progresso | null = null;

export function progresso(): Progresso {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    cache = { ...PADRAO, ...(bruto ? JSON.parse(bruto) : {}) };
  } catch {
    cache = { ...PADRAO };
  }
  return cache!;
}

export function guardar(parcial: Partial<Progresso>) {
  cache = { ...progresso(), ...parcial };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    /* aparelho cheio ou modo privado: o jogo segue sem salvar */
  }
}

export function ganhou(id: number) {
  const p = progresso();
  if (!p.ganhas.includes(id)) guardar({ ganhas: [...p.ganhas, id] });
}

/** A fase está liberada se é a 1ª, se já foi ganha ou se a anterior foi ganha. */
export function liberada(id: number): boolean {
  const g = progresso().ganhas;
  return id === 1 || g.includes(id) || g.includes(id - 1);
}

export function esquecerTudoParaTeste() {
  cache = null;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
