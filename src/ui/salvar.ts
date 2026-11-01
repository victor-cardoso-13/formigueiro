/**
 * Guarda o progresso no próprio aparelho (localStorage). Sem conta, sem nuvem.
 * Se um dia as fases forem recriadas, troque o "v4" da chave.
 * (v1 era a versão antiga com trilha e fome; o jogo foi refeito e o progresso antigo não vale mais.)
 */
const CHAVE = 'formigueiro:v4';

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

/**
 * Dentro de cada nível (fácil, médio, difícil, desafio) as fases abrem em ordem: a 1ª está sempre livre e a seguinte
 * abre quando a anterior do MESMO nível é ganha. Os níveis em si são livres: dá para começar por qualquer um.
 */
export function liberada(f: { id: number; grupo: string }, todas: { id: number; grupo: string }[]): boolean {
  const g = progresso().ganhas;
  const doNivel = todas.filter((x) => x.grupo === f.grupo);
  const i = doNivel.findIndex((x) => x.id === f.id);
  return i <= 0 || g.includes(f.id) || g.includes(doNivel[i - 1].id);
}

export function esquecerTudoParaTeste() {
  cache = null;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
