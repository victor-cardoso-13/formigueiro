/**
 * Guarda o progresso no próprio aparelho (localStorage). Sem conta, sem nuvem.
 * Se um dia as fases forem recriadas, troque o "v2" da chave.
 * (v1 era a versão antiga com trilha e fome; o jogo foi refeito e o progresso antigo não vale mais.)
 */
const CHAVE = 'formigueiro:v2';

export type Velocidade = 1 | 2 | 3;
export type TelaSalva = 'inicio' | 'mapa' | 'jogo';

/** Ajudas opcionais (ficam desligadas até a pessoa ligar em Ajustes). */
export interface Ajudas {
  /** símbolo (●▲■…) em cada cor, para quem não distingue bem algumas cores */
  simbolos: boolean;
}

export interface Progresso {
  ajudas: Ajudas;
  ganhas: number[];
  faseAtual: number;
  velocidade: Velocidade;
  tutorialVisto: boolean;
  faixasVistas: number[];
  tela: TelaSalva;
}

const PADRAO: Progresso = { ajudas: { simbolos: false }, ganhas: [], faseAtual: 1, velocidade: 1, tutorialVisto: false, faixasVistas: [], tela: 'inicio' };

let cache: Progresso | null = null;

export function progresso(): Progresso {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lido = bruto ? JSON.parse(bruto) : {};
    // só pegamos os campos que existem hoje; qualquer campo antigo (ex.: "olho") é ignorado
    const v = [1, 2, 3].includes(lido.velocidade) ? (lido.velocidade as Velocidade) : PADRAO.velocidade;
    cache = {
      ganhas: Array.isArray(lido.ganhas) ? lido.ganhas.filter((n: unknown) => typeof n === 'number') : [],
      faseAtual: typeof lido.faseAtual === 'number' ? lido.faseAtual : PADRAO.faseAtual,
      velocidade: v,
      tutorialVisto: !!lido.tutorialVisto,
      faixasVistas: Array.isArray(lido.faixasVistas) ? lido.faixasVistas : [],
      tela: ['inicio', 'mapa', 'jogo'].includes(lido.tela) ? lido.tela : PADRAO.tela,
      ajudas: { simbolos: !!lido.ajudas?.simbolos },
    };
  } catch {
    cache = { ...PADRAO, ajudas: { ...PADRAO.ajudas } };
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
