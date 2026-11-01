/**
 * Guarda o progresso no próprio aparelho (localStorage). Sem conta, sem nuvem.
 * Se um dia as fases forem recriadas, troque o "v4" da chave.
 * (v1 era a versão antiga com trilha e fome; o jogo foi refeito e o progresso antigo não vale mais.)
 */
const BASE = 'formigueiro:v4';
/** Última conta que entrou neste aparelho (só um "marcador", não é senha). */
const ULTIMA_CONTA = 'formigueiro:ultima-conta';
/** Cada conta tem a sua "gaveta" no aparelho, e quem joga sem conta tem outra: duas pessoas no mesmo celular não misturam o progresso. */
const chave = (uid: string | null) => (uid ? `${BASE}:conta:${uid}` : BASE);

export type Velocidade = 1 | 2 | 3;
export type TelaSalva = 'inicio' | 'mapa' | 'jogo';

/** Ajudas opcionais (ficam desligadas até a pessoa ligar em Ajustes). */
export interface Ajudas {
  /** símbolo (●▲■…) em cada cor, para quem não distingue bem algumas cores */
  simbolos: boolean;
}

export interface Progresso {
  ajudas: Ajudas;
  /** quando os símbolos foram ligados/desligados por último (para juntar com a nuvem) */
  simbolosEm: number;
  ganhas: number[];
  faseAtual: number;
  velocidade: Velocidade;
  tutorialVisto: boolean;
  faixasVistas: number[];
  tela: TelaSalva;
}

const PADRAO: Progresso = { ajudas: { simbolos: false }, simbolosEm: 0, ganhas: [], faseAtual: 1, velocidade: 1, tutorialVisto: false, faixasVistas: [], tela: 'inicio' };

let cache: Progresso | null = null;
/** De quem é a gaveta aberta agora (null = jogando sem conta). */
let dono: string | null = localStorage.getItem(ULTIMA_CONTA);
let aoSalvar: ((p: Progresso) => void) | null = null;

export const contaAtiva = () => dono;

/** Troca de gaveta (entrou, saiu ou trocou de conta). */
export function usarConta(uid: string | null) {
  dono = uid;
  cache = null;
  try {
    if (uid) localStorage.setItem(ULTIMA_CONTA, uid);
    else localStorage.removeItem(ULTIMA_CONTA);
  } catch {
    /* ignora */
  }
}

/** Avisa a nuvem a cada salvamento (quem chama decide quando enviar). */
export function quandoSalvar(fn: ((p: Progresso) => void) | null) {
  aoSalvar = fn;
}

/** Lê a gaveta de `uid` (null = sem conta). Só pega os campos que existem hoje. */
export function carregar(uid: string | null = dono): Progresso {
  try {
    const bruto = localStorage.getItem(chave(uid));
    const lido = bruto ? JSON.parse(bruto) : {};
    const v = [1, 2, 3].includes(lido.velocidade) ? (lido.velocidade as Velocidade) : PADRAO.velocidade;
    return {
      ganhas: Array.isArray(lido.ganhas) ? lido.ganhas.filter((n: unknown) => typeof n === 'number') : [],
      faseAtual: typeof lido.faseAtual === 'number' ? lido.faseAtual : PADRAO.faseAtual,
      velocidade: v,
      tutorialVisto: !!lido.tutorialVisto,
      faixasVistas: Array.isArray(lido.faixasVistas) ? lido.faixasVistas : [],
      tela: ['inicio', 'mapa', 'jogo'].includes(lido.tela) ? lido.tela : PADRAO.tela,
      ajudas: { simbolos: !!lido.ajudas?.simbolos },
      simbolosEm: typeof lido.simbolosEm === 'number' ? lido.simbolosEm : 0,
    };
  } catch {
    return { ...PADRAO, ajudas: { ...PADRAO.ajudas } };
  }
}

export function progresso(): Progresso {
  return (cache ??= carregar(dono));
}

function gravar(p: Progresso, uid: string | null) {
  try {
    localStorage.setItem(chave(uid), JSON.stringify(p));
  } catch {
    /* aparelho cheio ou modo privado: o jogo segue sem salvar */
  }
}

export function guardar(parcial: Partial<Progresso>) {
  const antes = progresso();
  const novo = { ...antes, ...parcial };
  if (parcial.ajudas && parcial.ajudas.simbolos !== antes.ajudas.simbolos) novo.simbolosEm = Date.now();
  cache = novo;
  gravar(novo, dono);
  aoSalvar?.(novo);
}

/** Troca o progresso da gaveta aberta por outro (juntado com a nuvem) sem avisar a nuvem de novo. */
export function definirProgresso(p: Progresso, uid: string | null = dono) {
  gravar(p, uid);
  if (uid === dono) cache = p;
}

/** Apaga a gaveta de quem joga sem conta (depois de levar o progresso para uma conta). */
export function limparSemConta() {
  try {
    localStorage.removeItem(chave(null));
  } catch {
    /* ignora */
  }
}

/** Há algum progresso (fases ganhas)? */
export const temProgresso = (p: Progresso) => p.ganhas.length > 0;

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
    localStorage.removeItem(chave(dono));
  } catch {
    /* ignora */
  }
}
