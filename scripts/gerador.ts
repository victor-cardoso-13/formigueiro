/**
 * Gerador de fases do Formigueiro (roda no Node 26 direto: `node scripts/gerar.ts`).
 * Ideia: a fase NASCE de uma solução. Joga-se de verdade (com o motor) uma formiga por vez, e a fome de cada
 * formiga é o que ela comeu. Depois as formigas são repartidas em colunas mantendo a ordem dentro de cada coluna.
 */
import { REGRAS } from '../src/motor/regras.ts';
import { clonar, formigaEm, novoEstado, origemDe, passo, podeTocar, rodarAteParar, tocar, toqueDe } from '../src/motor/jogo.ts';
import type { Celula, Especial, Estado, Fase, FormigaFase, Grupo, Origem } from '../src/motor/tipos.ts';
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
  colunas: number;
  fomeMin: number;
  fomeMax: number;
  /** chance de uma formiga nova ter fome a mais (vai para a espera e volta) */
  pSobra: number;
  /** quantas formigas esperando ao mesmo tempo, no máximo, na solução */
  maxEspera: number;
  /** chance de reaproveitar uma formiga da espera quando ela já consegue terminar */
  pReuso: number;
  folhas: number; // fração das células
  duros: number; // fração
  dorminhocas: number; // quantidade
}

export const PADRAO: Record<Grupo, Parametros> = {
  facil: { colunas: 2, fomeMin: 4, fomeMax: 20, pSobra: 0, maxEspera: 2, pReuso: 0.5, folhas: 0, duros: 0, dorminhocas: 0 },
  media: { colunas: 3, fomeMin: 5, fomeMax: 30, pSobra: 0.15, maxEspera: 3, pReuso: 0.4, folhas: 0, duros: 0, dorminhocas: 0 },
  dificil: { colunas: 4, fomeMin: 5, fomeMax: 40, pSobra: 0.3, maxEspera: 3, pReuso: 0.35, folhas: 0.06, duros: 0, dorminhocas: 0 },
  'muito-dificil': { colunas: 5, fomeMin: 5, fomeMax: 50, pSobra: 0.4, maxEspera: 4, pReuso: 0.3, folhas: 0.08, duros: 0.08, dorminhocas: 4 },
};

export const FAIXA: Record<Grupo, [number, number]> = {
  facil: [0.6, 1],
  media: [0.2, 0.6],
  dificil: [0.05, 0.2],
  'muito-dificil': [0, 0.05],
};

export function desenhoDeLinhas(linhas: string[]): (Celula | null)[][] {
  return linhas.map((l) =>
    [...l].map((ch) => (ch === '.' ? null : { cor: corDeLetra(ch) < 0 ? parseInt(ch, 36) : corDeLetra(ch), mordidas: 1, duro: false, folha: false })),
  );
}

/** Converte linhas com letras da paleta em linhas "congeladas" (cor em base 36). */
export function congelar(linhas: string[]): string[] {
  return linhas.map((l) => [...l].map((ch) => (ch === '.' ? '.' : corDeLetra(ch).toString(36))).join(''));
}

function estadoVazio(desenho: (Celula | null)[][]): Estado {
  let pedacos = 0;
  for (const l of desenho) for (const c of l) if (c) pedacos++;
  return {
    largura: desenho[0].length,
    altura: desenho.length,
    desenho,
    colunas: [],
    espera: Array.from({ length: REGRAS.LUGARES_ESPERA }, () => null),
    trilha: [],
    saidas: 0,
    passo: 0,
    pedacos,
    resultado: 'jogando',
  };
}

/** Simula uma volta de UMA formiga (cor, fome) num desenho copiado. */
function volta(desenho: (Celula | null)[][], cor: number, fome: number) {
  const copia = desenho.map((l) => l.map((c) => (c ? { ...c } : null)));
  const f = { id: 1, cor, fome };
  const e = estadoVazio(copia);
  e.colunas = [[f]];
  tocar(e, { coluna: 0 });
  rodarAteParar(e);
  return { comeu: fome - f.fome, desenho: e.desenho };
}

const somaMordidas = (desenho: (Celula | null)[][], cor: number) => {
  let n = 0;
  for (const l of desenho) for (const c of l) if (c && c.cor === cor) n += c.mordidas;
  return n;
};
const contaPedacos = (desenho: (Celula | null)[][]) => desenho.reduce((s, l) => s + l.filter(Boolean).length, 0);

interface FormigaPlano {
  cor: number;
  fome: number;
}
type Toque = { nova: number } | { reuso: number };

/** Constrói a sequência de formigas e toques que esvazia o desenho. Retorna null se emperrar. */
export function planejar(desenhoInicial: (Celula | null)[][], p: Parametros, rng: Rng) {
  let desenho = desenhoInicial.map((l) => l.map((c) => (c ? { ...c } : null)));
  const formigas: FormigaPlano[] = [];
  const toques: Toque[] = [];
  const pendentes: { idx: number; cor: number; resta: number }[] = [];
  const cores = [...new Set(desenho.flat().filter(Boolean).map((c) => c!.cor))];
  let guarda = 0;
  while (contaPedacos(desenho) > 0) {
    if (guarda++ > 5000) return null;
    // 1) reaproveitar uma formiga da espera que já consegue terminar (obrigatório se ela é a última da cor)
    let feito = false;
    const ordem = embaralhar(rng, pendentes);
    for (const pd of ordem) {
      const obrigatorio = somaMordidas(desenho, pd.cor) === pd.resta || pendentes.length >= p.maxEspera;
      if (!obrigatorio && rng() > p.pReuso) continue;
      const r = volta(desenho, pd.cor, pd.resta);
      if (r.comeu === pd.resta) {
        desenho = r.desenho;
        toques.push({ reuso: pd.idx });
        pendentes.splice(pendentes.indexOf(pd), 1);
        feito = true;
        break;
      }
    }
    if (feito) continue;
    // 2) formiga nova
    const reservado = (cor: number) => pendentes.filter((x) => x.cor === cor).reduce((s, x) => s + x.resta, 0);
    const opcoes = cores
      .map((cor) => {
        const permitido = somaMordidas(desenho, cor) - reservado(cor);
        if (permitido <= 0) return null;
        const r = volta(desenho, cor, permitido);
        return r.comeu > 0 ? { cor, pot: r.comeu } : null;
      })
      .filter((x): x is { cor: number; pot: number } => !!x);
    if (opcoes.length === 0) {
      if (pendentes.length === 0) return null; // emperrou (folhas que nunca caem)
      // tenta qualquer pendente (mesmo não obrigatório)
      let ok = false;
      for (const pd of pendentes) {
        const r = volta(desenho, pd.cor, pd.resta);
        if (r.comeu === pd.resta) {
          desenho = r.desenho;
          toques.push({ reuso: pd.idx });
          pendentes.splice(pendentes.indexOf(pd), 1);
          ok = true;
          break;
        }
      }
      if (!ok) return null;
      continue;
    }
    const boas = opcoes.filter((o) => o.pot >= Math.min(p.fomeMin, 3) + 1 && o.pot >= p.fomeMin);
    const escolha = (boas.length ? boas : opcoes)[Math.floor(rng() * (boas.length ? boas.length : opcoes.length))];
    const alvoFome = inteiro(rng, p.fomeMin, p.fomeMax);
    let comer = Math.min(escolha.pot, alvoFome);
    let fome = comer;
    const idx = formigas.length;
    if (pendentes.length < p.maxEspera && rng() < p.pSobra && comer >= 2 && escolha.pot <= alvoFome) {
      // come tudo o que dá e ainda fica com fome: vai esperar
      const sobra = inteiro(rng, 1, 3);
      const restante = somaMordidas(desenho, escolha.cor) - reservado(escolha.cor) - comer;
      if (restante >= sobra) {
        fome = comer + sobra;
        pendentes.push({ idx, cor: escolha.cor, resta: sobra });
      }
    }
    const r = volta(desenho, escolha.cor, fome);
    if (r.comeu !== comer) {
      // inesperado (não deveria acontecer): desfaz o pendente e segue com o que comeu
      comer = r.comeu;
      if (fome !== comer && !pendentes.some((x) => x.idx === idx)) fome = comer;
    }
    desenho = r.desenho;
    formigas.push({ cor: escolha.cor, fome });
    toques.push({ nova: idx });
  }
  if (pendentes.length) return null;
  return { formigas, toques };
}

/** Reparte as formigas novas nas colunas (mantendo a ordem) respeitando as dorminhocas. */
export function repartir(formigas: FormigaPlano[], nColunas: number, dorminhocas: number, rng: Rng) {
  const n = formigas.length;
  // escolhe quem dorme: posições >= 4 na ordem, sem ser das últimas
  const candidatas = embaralhar(rng, Array.from({ length: Math.max(0, n - 6) }, (_, i) => i + 4));
  const dormem = new Set(candidatas.slice(0, dorminhocas));
  const colunas: (FormigaFase & { i: number })[][] = Array.from({ length: nColunas }, () => []);
  for (let i = 0; i < n; i++) {
    let permitidas = colunas.map((_, c) => c);
    if (dormem.has(i)) {
      permitidas = permitidas.filter((c) => {
        const col = colunas[c];
        const ultimo = col.length ? col[col.length - 1].i : -1;
        return col.length === 0 ? i >= 3 : ultimo <= i - 4;
      });
      if (permitidas.length === 0) dormem.delete(i);
    }
    if (permitidas.length === 0) permitidas = colunas.map((_, c) => c);
    const menor = Math.min(...permitidas.map((c) => colunas[c].length));
    const folgadas = permitidas.filter((c) => colunas[c].length <= menor + 1);
    const c = folgadas[Math.floor(rng() * folgadas.length)];
    const f: FormigaFase & { i: number } = { cor: formigas[i].cor, fome: formigas[i].fome, i };
    if (dormem.has(i)) f.dorme = true;
    colunas[c].push(f);
  }
  return colunas;
}

/** Joga a solução de verdade e devolve os toques (ou null se não vencer). */
export function jogarSolucao(fase: Fase, toques: Toque[], indiceDeNova: Map<number, number>): number[] | null {
  const e = novoEstado(fase);
  const saida: number[] = [];
  // id de cada formiga nova: o motor numera coluna por coluna, na ordem.
  const idDe = new Map<number, number>();
  let id = 1;
  fase.colunas.forEach((col) => col.forEach((f) => idDe.set((f as FormigaFase & { i: number }).i, id++)));
  void indiceDeNova;
  for (const t of toques) {
    let origem: Origem;
    if ('nova' in t) {
      const alvoId = idDe.get(t.nova)!;
      const col = e.colunas.findIndex((c) => c[0]?.id === alvoId);
      if (col < 0) return null;
      origem = { coluna: col };
    } else {
      const alvoId = idDe.get(t.reuso)!;
      const lugar = e.espera.findIndex((f) => f?.id === alvoId);
      if (lugar < 0) return null;
      origem = { espera: lugar };
    }
    if (!podeTocar(e, origem)) return null;
    tocar(e, origem);
    rodarAteParar(e);
    saida.push(toqueDe(origem));
    if (e.resultado !== 'jogando') break;
  }
  return e.resultado === 'vitoria' ? saida : null;
}

/** Partidas ao acaso entre os toques válidos. Retorna a fração que ganha. */
export function taxaAleatoria(fase: Fase, partidas: number, semente: number): number {
  const rng = mulberry32(semente);
  const total = fase.colunas.reduce((s, c) => s + c.length, 0);
  let ganhou = 0;
  for (let k = 0; k < partidas; k++) {
    const e = novoEstado(fase);
    let toques = 0;
    let passos = 0;
    const maxToques = total * 6 + 40;
    while (e.resultado === 'jogando' && passos < 200000) {
      const validos: Origem[] = [];
      for (let c = 0; c < e.colunas.length; c++) if (podeTocar(e, { coluna: c })) validos.push({ coluna: c });
      for (let j = 0; j < e.espera.length; j++) if (podeTocar(e, { espera: j })) validos.push({ espera: j });
      if (validos.length > 0 && (e.trilha.length === 0 || rng() < 0.5) && toques < maxToques) {
        tocar(e, validos[Math.floor(rng() * validos.length)]);
        toques++;
      } else if (e.trilha.length > 0) {
        passo(e);
        passos++;
      } else break; // nada a fazer
    }
    if (e.resultado === 'vitoria') ganhou++;
  }
  return ganhou / partidas;
}

export interface Entrada {
  id: number;
  grupo: Grupo;
  nome: string;
  linhas: string[]; // letras da paleta
  semente: number;
  especiais?: { folha?: boolean; duro?: boolean; dorminhoca?: boolean };
  faixa?: string;
  /** substitui partes de PADRAO[grupo] */
  param?: Partial<Parametros>;
  partidas?: number;
}

function sorteiaCelulas(desenho: (Celula | null)[][], fracao: number, rng: Rng, exclui = new Set<string>()): [number, number][] {
  const todas: [number, number][] = [];
  desenho.forEach((l, y) => l.forEach((c, x) => c && !exclui.has(`${x},${y}`) && todas.push([x, y])));
  const n = Math.round(todas.length * fracao);
  return embaralhar(rng, todas).slice(0, n);
}

/** Tenta montar UMA fase com os parâmetros dados. */
export function montar(ent: Entrada, p: Parametros, tentativa: number): Fase | null {
  const rng = mulberry32(ent.semente * 1009 + tentativa * 7919 + 13);
  const base = desenhoDeLinhas(ent.linhas);
  const esp = ent.especiais ?? {};
  const folhas = esp.folha ? sorteiaCelulas(base, p.folhas, rng) : [];
  const duros = esp.duro ? sorteiaCelulas(base, p.duros, rng) : [];
  for (const [x, y] of folhas) base[y][x]!.folha = true;
  for (const [x, y] of duros) {
    base[y][x]!.duro = true;
    base[y][x]!.mordidas = REGRAS.MORDIDAS_TORRAO;
  }
  const plano = planejar(base, p, rng);
  if (!plano) return null;
  const nColunas = p.colunas;
  const dormem = esp.dorminhoca ? p.dorminhocas : 0;
  const colunasI = repartir(plano.formigas, nColunas, dormem, rng);
  const especiais: Especial[] = [];
  if (folhas.length) especiais.push('folha');
  if (duros.length) especiais.push('duro');
  if (colunasI.some((c) => c.some((f) => f.dorme))) especiais.push('dorminhoca');
  const fase: Fase = {
    id: ent.id,
    grupo: ent.grupo,
    nome: ent.nome,
    largura: ent.linhas[0].length,
    altura: ent.linhas.length,
    desenho: congelar(ent.linhas),
    folhas,
    duros,
    colunas: colunasI as unknown as FormigaFase[][],
    especiais,
    solucao: [],
    taxaAleatoria: 0,
  };
  if (ent.faixa) fase.faixa = ent.faixa;
  const sol = jogarSolucao(fase, plano.toques, new Map());
  if (!sol) return null;
  fase.solucao = sol;
  // tira o campo auxiliar "i"
  fase.colunas = fase.colunas.map((c) => c.map((f) => {
    const g: FormigaFase = { cor: f.cor, fome: f.fome };
    if (f.dorme) g.dorme = true;
    return g;
  }));
  return fase;
}

export interface Resultado {
  fase: Fase;
  tentativas: number;
  naFaixa: boolean;
  param: Parametros;
}

/** Gera a fase ajustando a dificuldade até a taxa de partidas ao acaso cair na faixa do grupo. */
export function gerarFase(ent: Entrada, maxTentativas = 14): Resultado {
  const [lo, hi] = FAIXA[ent.grupo];
  let p: Parametros = { ...PADRAO[ent.grupo], ...ent.param };
  const esp = ent.especiais ?? {};
  if (!esp.folha) p.folhas = 0;
  if (!esp.duro) p.duros = 0;
  if (!esp.dorminhoca) p.dorminhocas = 0;
  let melhor: Resultado | null = null;
  let melhorDist = Infinity;
  const partidas = ent.partidas ?? 300;
  let falhas = 0;
  for (let t = 0; t < maxTentativas + falhas && t < maxTentativas * 3; t++) {
    const fase = montar(ent, p, t);
    if (!fase) {
      falhas++;
      continue;
    }
    const taxa = taxaAleatoria(fase, partidas, ent.semente + t);
    fase.taxaAleatoria = Math.round(taxa * 1000) / 1000;
    const dist = taxa < lo ? lo - taxa : taxa > hi ? taxa - hi : 0;
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = { fase, tentativas: t + 1, naFaixa: dist === 0, param: { ...p } };
    }
    if (dist === 0) break;
    // ajuste: fácil demais -> mais sobras e mais fome; difícil demais -> menos
    if (taxa > hi) {
      p = { ...p, pSobra: Math.min(0.9, p.pSobra + 0.12), fomeMax: Math.round(p.fomeMax * 1.15), maxEspera: Math.min(4, p.maxEspera + (t % 3 === 2 ? 1 : 0)) };
    } else {
      p = { ...p, pSobra: Math.max(0, p.pSobra - 0.12), fomeMax: Math.max(p.fomeMin + 3, Math.round(p.fomeMax * 0.87)) };
    }
  }
  if (!melhor) throw new Error(`Fase ${ent.id} (${ent.nome}): não consegui montar nenhuma solução`);
  return melhor;
}

// Usados só para evitar aviso de import não usado em alguns usos.
export type { Fase };
void clonar;
void formigaEm;
void origemDe;
