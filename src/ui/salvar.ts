/**
 * Guarda o progresso no próprio aparelho (localStorage). Sem conta, sem nuvem.
 * Se um dia as fases forem recriadas, troque o "v1" da chave.
 */
const CHAVE = 'formigueiro:v1';

export type Velocidade = 1 | 2 | 5;
export type TelaSalva = 'inicio' | 'mapa' | 'jogo';

/** Ajudas opcionais (ficam desligadas até a pessoa ligar em Ajustes). */
export interface Ajudas {
  /** 👁 N em cada formiga pronta + contorno nos pedacinhos que ela enxerga */
  olho: boolean;
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

const PADRAO: Progresso = { ajudas: { olho: false, simbolos: false }, ganhas: [], faseAtual: 1, velocidade: 1, tutorialVisto: false, faixasVistas: [], tela: 'inicio' };

let cache: Progresso | null = null;

export function progresso(): Progresso {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lido = bruto ? JSON.parse(bruto) : {};
    cache = { ...PADRAO, ...lido, ajudas: { ...PADRAO.ajudas, ...(lido.ajudas ?? {}) } };
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
