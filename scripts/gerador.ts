/**
 * Gerador de fases do Formigueiro ("Colony Flow"). Roda no Node 26 direto: `node scripts/gerar.ts`.
 *
 * Ideia: a fase NASCE de uma solução, planejada com o MOTOR REAL.
 *  1. Parte-se de um quadro cheio (a imagem). Escolhe-se uma "unidade" (1 ninho, ou 2–3 ninhos de cores diferentes ligados por cano)
 *     cujas cores têm quadradinhos expostos agora; testa-se num clone (sobe nas vagas, roda até parar) e o tamanho de cada ninho
 *     é reduzido ao que ele realmente entregou. O estado do clone vira o novo estado base. Repete até o quadro esvaziar.
 *  2. As unidades, na ordem do planejamento, são arrumadas numa grade de C colunas (cada linha leva unidades consecutivas;
 *     dentro da linha a ordem é embaralhada). A solução = a primeira peça de cada unidade, na ordem do planejamento.
 *  3. O replay da solução no motor tem de vencer. Mede-se a dificuldade com um robô que joga ao acaso.
 */
import { clonar, frente, novoEstado, parado, passo, podeTocar, restantesDaCor, rodarAteParar, tocar, expostos } from '../src/motor/colonia.ts';
import type { Estado, Fase, Grupo, Ninho, NinhoFase } from '../src/motor/tipos.ts';
import { corDeLetra } from '../src/fases/paleta.ts';

export function mulberry32(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;
const inteiro = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
function embaralhar<T>(rng: Rng, v: T[]): T[] {
  const r = [...v];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export interface Parametros {
  /** tamanho dos ninhos (quadradinhos que cada um leva) */
  tamMin: number;
  tamMax: number;
  /** chance de a unidade ser um par / um trio ligado por cano */
  pPar: number;
  pTrio: number;
  /** 0..1: quanto o layout vira "pistas" (mais armadilhas na frente) */
  mistura: number;
}

export interface Entrada {
  id: number;
  grupo: Grupo;
  nome: string;
  /** desenho em letras da paleta (sem buracos) */
  linhas: string[];
  colunas: number;
  semente: number;
  param: Parametros;
  /** nº de partidas do robô */
  partidas: number;
}

/** Faixa-alvo da taxa do robô por grupo (aproximada). */
export const FAIXA: Record<Grupo, [number, number]> = {
  facil: [0.7, 1],
  media: [0.3, 0.7],
  dificil: [0.1, 0.35],
  'muito-dificil': [0, 0.15],
};

export const distanciaDaFaixa = (g: Grupo, taxa: number): number => {
  const [a, b] = FAIXA[g];
  return taxa < a ? a - taxa : taxa > b ? taxa - b : 0;
};

export interface Unidade {
  ninhos: { cor: number; n: number }[];
}

const aBase36 = (linhas: string[]): string[] => linhas.map((l) => [...l].map((c) => (c === '.' ? '.' : corDeLetra(c).toString(36))).join(''));

function faseVazia(e: Entrada): Fase {
  const desenho = aBase36(e.linhas);
  return { id: e.id, grupo: e.grupo, nome: e.nome, largura: desenho[0].length, altura: desenho.length, desenho, grade: [], solucao: [], taxaAleatoria: 0 };
}

// ---------- 1. planejamento com o motor real ----------

/** Roda uma unidade (ninhos nas vagas 0.. em ordem) num clone. Retorna o clone e quanto cada ninho entregou. */
function testarUnidade(base: Estado, cores: number[], ks: number[]): { e: Estado; entregues: number[] } {
  const e = clonar(base);
  e.resultado = 'jogando';
  delete e.motivo;
  const grupo = cores.length > 1 ? 1 : undefined;
  const ninhos: Ninho[] = cores.map((cor, i) => {
    const n: Ninho = { id: i + 1, cor, n: ks[i], restam: ks[i], espera: 0 };
    if (grupo !== undefined) n.grupo = grupo;
    return n;
  });
  // um ninho "enfeite" para o motor nunca dar derrota por falta de toque (não é tocado)
  e.grade = [[...ninhos, { id: 99, cor: 0, n: 1, restam: 1, espera: 0 }]];
  if (!tocar(e, 1)) throw new Error('toque inválido no planejamento');
  rodarAteParar(e);
  return { e, entregues: ninhos.map((n) => n.n - n.restam) };
}

/** Fecha uma unidade: reduz o tamanho ao entregue e confere até estabilizar. Retorna null se algum ninho ficou sem entregar nada. */
function fecharUnidade(base: Estado, cores: number[], ks: number[]): { e: Estado; ks: number[] } | null {
  let atual = [...ks];
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = testarUnidade(base, cores, atual);
    if (r.entregues.every((v, i) => v === atual[i])) {
      r.e.grade = [];
      r.e.vagas = r.e.vagas.map(() => null);
      r.e.resultado = r.e.pedacos === 0 ? 'vitoria' : 'jogando';
      return { e: r.e, ks: atual };
    }
    if (r.entregues.some((v) => v <= 0)) return null;
    atual = r.entregues;
  }
  return null;
}

function planejar(desenho: string[], P: Parametros, rng: Rng): Unidade[] {
  let base = novoEstado({ id: 0, grupo: 'facil', nome: '', largura: desenho[0].length, altura: desenho.length, desenho, grade: [], solucao: [], taxaAleatoria: 0 });
  const unidades: Unidade[] = [];
  let guarda = 0;
  while (base.pedacos > 0 && guarda++ < 5000) {
    const comExposto: number[] = [];
    for (let c = 0; c < 11; c++) if (restantesDaCor(base, c) > 0 && expostos(base, c).length > 0) comExposto.push(c);
    if (!comExposto.length) throw new Error('quadro sem quadradinho exposto');
    const r = rng();
    let s = r < P.pTrio ? 3 : r < P.pTrio + P.pPar ? 2 : 1;
    s = Math.min(s, comExposto.length);
    const tamanho = (cor: number) => {
      const resta = restantesDaCor(base, cor);
      let k = Math.min(inteiro(rng, P.tamMin, P.tamMax), resta);
      if (resta - k < Math.ceil(P.tamMin / 2)) k = resta;
      return k;
    };
    let fechada: { e: Estado; ks: number[]; cores: number[] } | null = null;
    for (let t = 0; t < 3 && s > 1 && !fechada; t++) {
      const cores = embaralhar(rng, comExposto).slice(0, s);
      const f = fecharUnidade(base, cores, cores.map(tamanho));
      if (f) fechada = { ...f, cores };
    }
    if (!fechada) {
      const cor = comExposto[Math.floor(rng() * comExposto.length)];
      const f = fecharUnidade(base, [cor], [tamanho(cor)]);
      if (!f) continue;
      fechada = { ...f, cores: [cor] };
    }
    const antes = base.pedacos;
    base = fechada.e;
    if (base.pedacos >= antes) throw new Error('unidade sem efeito');
    unidades.push({ ninhos: fechada.cores.map((cor, i) => ({ cor, n: fechada!.ks[i] })) });
  }
  if (base.pedacos > 0) throw new Error('planejamento não terminou');
  return unidades;
}

// ---------- 2. grade ----------

/**
 * Arruma as unidades na grade (colunas = pilhas). Cada unidade, na ordem do planejamento, vai para o fundo de uma(s) coluna(s):
 * isso garante que a solução (ordem do planejamento) sempre tem o ninho na frente na hora de tocar.
 * `mistura` = chance de um ninho avulso ir para a "pista" da sua posição no plano (colunas viram trechos do plano: os ninhos
 * da frente ficam "do futuro", com a cor ainda escondida, e viram armadilhas); senão (e sempre para canos) vai para onde as
 * pilhas estão mais baixas (linhas quase completas). Um grupo (cano) ocupa colunas vizinhas na mesma linha; colunas mais baixas
 * ganham lugar vazio (null) até a linha dele. Cada coluna é limitada a uma altura "justa" para a grade ficar compacta.
 */
function montarGrade(unidades: Unidade[], colunas: number, mistura: number, rng: Rng): { grade: (NinhoFase | null)[][]; solucao: number[] } {
  type Cel = { ninho: NinhoFase; unidade: Unidade } | null;
  const pilhas: Cel[][] = Array.from({ length: colunas }, () => []);
  let g = 0;
  const total = unidades.length;
  // altura "justa" de uma coluna: assim a grade final fica compacta (poucos lugares vazios)
  const limite = Math.ceil(unidades.reduce((t, u) => t + u.ninhos.length, 0) / colunas) + 1;
  const altura = (c: number) => pilhas[c].length;
  unidades.forEach((u, i) => {
    const s = u.ninhos.length;
    const opcoes = colunas - s + 1;
    // pista do plano (só para ninhos avulsos; canos vão para onde as pilhas estão mais baixas)
    const pista = Math.min(colunas - 1, Math.floor(((i + rng()) / total) * colunas));
    let c0 = -1;
    if (s === 1 && rng() < mistura && altura(pista) < limite) c0 = pista;
    if (c0 < 0) {
      let melhor = Infinity;
      const empates: number[] = [];
      for (let c = 0; c < opcoes; c++) {
        let alt = 0;
        let lacuna = 0;
        for (let k = 0; k < s; k++) alt = Math.max(alt, altura(c + k));
        for (let k = 0; k < s; k++) lacuna += alt - altura(c + k);
        const custo = alt * 100 + lacuna;
        if (custo < melhor) {
          melhor = custo;
          empates.length = 0;
        }
        if (custo === melhor) empates.push(c);
      }
      c0 = empates[Math.floor(rng() * empates.length)];
    }
    let linha = 0;
    for (let k = 0; k < s; k++) linha = Math.max(linha, pilhas[c0 + k].length);
    const gid = s > 1 ? ++g : undefined;
    u.ninhos.forEach((n, k) => {
      const pilha = pilhas[c0 + k];
      while (pilha.length < linha) pilha.push(null);
      pilha.push({ ninho: gid === undefined ? { cor: n.cor, n: n.n } : { cor: n.cor, n: n.n, g: gid }, unidade: u });
    });
  });
  const alturaFinal = Math.max(...pilhas.map((p) => p.length));
  const linhas: Cel[][] = Array.from({ length: alturaFinal }, (_, l) => pilhas.map((p) => p[l] ?? null));
  const primeiro = new Map<Unidade, number>();
  let id = 0;
  for (const row of linhas)
    for (const c of row) if (c) {
      id++;
      if (!primeiro.has(c.unidade)) primeiro.set(c.unidade, id);
    }
  return { grade: linhas.map((r) => r.map((c) => c?.ninho ?? null)), solucao: unidades.map((u) => primeiro.get(u)!) };
}

// ---------- 3. conferir e medir ----------

/** Refaz a solução no motor. */
export function jogarSolucao(fase: Fase): boolean {
  const e = novoEstado(fase);
  for (const id of fase.solucao) {
    if (!podeTocar(e, id)) return false;
    tocar(e, id);
    rodarAteParar(e);
  }
  return e.resultado === 'vitoria';
}

/** Uma partida de um robô que toca ao acaso (entre os toques válidos) e roda de 0 a 30 passos. */
export function jogarAoAcaso(fase: Fase, rng: Rng): boolean {
  const e = novoEstado(fase);
  let guarda = 0;
  while (e.resultado === 'jogando' && guarda++ < 10000) {
    const vistos = new Set<string>();
    const opcoes = frente(e).filter((n) => {
      if (!podeTocar(e, n.id)) return false;
      const chave = n.grupo === undefined ? `s${n.id}` : `g${n.grupo}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
    if (!opcoes.length) {
      if (parado(e)) break;
      rodarAteParar(e);
      continue;
    }
    tocar(e, opcoes[Math.floor(rng() * opcoes.length)].id);
    const passos = Math.floor(rng() * 31);
    for (let i = 0; i < passos && e.resultado === 'jogando'; i++) passo(e);
  }
  return e.resultado === 'vitoria';
}

export function taxaAleatoria(fase: Fase, partidas: number, semente: number): number {
  const rng = mulberry32(semente);
  let ganhou = 0;
  for (let i = 0; i < partidas; i++) if (jogarAoAcaso(fase, rng)) ganhou++;
  return Math.round((ganhou / partidas) * 1000) / 1000;
}

export interface Resultado {
  fase: Fase;
  naFaixa: boolean;
  tentativas: number;
}

/** Arruma um plano numa fase (e confere a solução no motor). */
export function montarFase(ent: Entrada, plano: Unidade[], mistura: number, semente: number): Fase {
  const base = faseVazia(ent);
  const { grade, solucao } = montarGrade(plano, ent.colunas, mistura, mulberry32(semente ^ 0x9e3779b9));
  const fase: Fase = { ...base, grade, solucao };
  if (!jogarSolucao(fase)) throw new Error(`solução não vence (fase ${ent.id})`);
  return fase;
}

/**
 * Para cada semente: planeja uma vez e procura (bisseção) a `mistura` do layout que deixa a taxa do robô dentro da faixa.
 * Guarda a fase mais próxima da faixa.
 */
export function gerarFase(ent: Entrada, maxSementes = 4, avaliacoesPorSemente = 6): Resultado {
  let melhor: { fase: Fase; d: number } | null = null;
  let avaliacoes = 0;
  const [, alvoMax] = FAIXA[ent.grupo];
  let P = { ...ent.param };
  for (let k = 0; k < maxSementes; k++) {
    const semente = ent.semente + k * 7919;
    let plano: Unidade[];
    try {
      plano = planejar(faseVazia(ent).desenho, P, mulberry32(semente));
    } catch (err) {
      console.log(`  (fase ${ent.id}: semente ${k} falhou: ${(err as Error).message})`);
      continue;
    }
    let lo = 0;
    let hi = 1;
    let m = P.mistura;
    let ultima = 0;
    for (let i = 0; i < avaliacoesPorSemente; i++) {
      avaliacoes++;
      const fase = montarFase(ent, plano, m, semente);
      fase.taxaAleatoria = taxaAleatoria(fase, ent.partidas, semente ^ 0x5bd1e995);
      const d = distanciaDaFaixa(ent.grupo, fase.taxaAleatoria);
      if (!melhor || d < melhor.d) melhor = { fase, d };
      if (d === 0) return { fase, naFaixa: true, tentativas: avaliacoes };
      ultima = fase.taxaAleatoria > alvoMax ? 1 : -1;
      if (ultima > 0) lo = m;
      else hi = m;
      if (hi - lo < 0.04) break;
      m = (lo + hi) / 2;
    }
    // nenhuma mistura serviu: muda o planejamento (ninhos menores e mais canos = mais difícil; o contrário = mais fácil)
    const f = ultima > 0 ? 0.75 : 1.3;
    P = {
      ...P,
      tamMin: Math.max(3, Math.round(P.tamMin * f)),
      tamMax: Math.max(6, Math.min(70, Math.round(P.tamMax * (ultima > 0 ? 0.85 : 1.15)))),
      pPar: ent.id >= 11 ? Math.min(0.6, Math.max(0, P.pPar + 0.1 * ultima)) : 0,
      pTrio: ent.id >= 31 ? Math.min(0.4, Math.max(0, P.pTrio + 0.05 * ultima)) : 0,
      mistura: ultima > 0 ? 0.8 : 0.1,
    };
  }
  if (!melhor) throw new Error(`fase ${ent.id}: não foi possível gerar`);
  return { fase: melhor.fase, naFaixa: melhor.d === 0, tentativas: avaliacoes };
}
