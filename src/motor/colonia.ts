/**
 * O jogo, por "passos" (30 por segundo na velocidade 1×). Puro e determinístico (sem Math.random, sem tela).
 * As funções MEXEM no estado recebido; use `clonar` antes de guardar um "antes" (Desfazer).
 *
 * Regras:
 * - Toque num ninho da FRENTE de uma coluna: ele sobe para uma vaga livre (ninhos ligados por cano sobem juntos
 *   e precisam de vagas livres para todos).
 * - Cada ninho ativo solta uma formiga a cada poucos passos. A formiga escolhe o quadradinho EXPOSTO da cor do ninho
 *   mais perto (exposto = o primeiro da linha ou da coluna, visto de fora do quadro), anda até ele pelo contorno,
 *   pega e leva até o buraco. Cada quadradinho só é escolhido por uma formiga.
 * - Sem quadradinho exposto da cor dele, o ninho espera na vaga (e ocupa a vaga!).
 * - Ninho que soltou todas as formigas libera a vaga. Quadro vazio e formigas entregues = vitória.
 * - Derrota: nenhuma formiga andando, nenhum ninho nas vagas consegue pegar nada e nenhum ninho pode subir.
 */
import { REGRAS } from './regras.ts';
import { acumular, caminhoIda, caminhoVolta, centroVaga, comprimentoIda } from './geometria.ts';
import type { Estado, Evento, Fase, Formiga, Lado, Ninho } from './tipos.ts';

export function novoEstado(fase: Fase): Estado {
  let pedacos = 0;
  const desenho = fase.desenho.map((l) =>
    [...l].map((ch) => {
      if (ch === '.') return -1;
      pedacos++;
      return parseInt(ch, 36);
    }),
  );
  let id = 1;
  const grade = fase.grade.map((linha) =>
    linha.map((n): Ninho | null => {
      if (!n) return null;
      const ninho: Ninho = { id: id++, cor: n.cor, n: n.n, restam: n.n, espera: 0 };
      if (n.g !== undefined) ninho.grupo = n.g;
      return ninho;
    }),
  );
  return {
    largura: fase.largura,
    altura: fase.altura,
    h: fase.altura / fase.largura,
    desenho,
    pedacos,
    reservados: {},
    grade,
    vagas: Array.from({ length: REGRAS.VAGAS }, () => null),
    formigas: [],
    proximaFormiga: 1,
    tique: 0,
    resultado: 'jogando',
  };
}

export const clonar = (e: Estado): Estado => structuredClone(e);

// ---------- ninhos da frente e toques ----------

/** Ninhos da frente: o primeiro (de cima) de cada coluna. */
export function frente(e: Estado): Ninho[] {
  const r: Ninho[] = [];
  const colunas = e.grade[0]?.length ?? 0;
  for (let c = 0; c < colunas; c++) {
    for (let l = 0; l < e.grade.length; l++) {
      const n = e.grade[l][c];
      if (n) {
        r.push(n);
        break;
      }
    }
  }
  return r;
}

/** Posição (linha, coluna) de um ninho na grade. */
export function lugarDe(e: Estado, id: number): { linha: number; coluna: number } | null {
  for (let l = 0; l < e.grade.length; l++)
    for (let c = 0; c < e.grade[l].length; c++) if (e.grade[l][c]?.id === id) return { linha: l, coluna: c };
  return null;
}

/** O ninho tocado e os ligados a ele por cano (da esquerda para a direita), ou null se não está na grade. */
export function unidade(e: Estado, id: number): Ninho[] | null {
  const lugar = lugarDe(e, id);
  if (!lugar) return null;
  const n = e.grade[lugar.linha][lugar.coluna]!;
  if (n.grupo === undefined) return [n];
  return e.grade[lugar.linha].filter((x): x is Ninho => !!x && x.grupo === n.grupo);
}

export const vagasLivres = (e: Estado): number => e.vagas.filter((v) => !v).length;

/** Por que o toque não vale (para a tela avisar), ou null se vale. */
export function motivoDeNaoPoder(e: Estado, id: number): 'fim' | 'atras' | 'vagas' | null {
  if (e.resultado !== 'jogando') return 'fim';
  const un = unidade(e, id);
  if (!un) return 'atras';
  const fr = new Set(frente(e).map((n) => n.id));
  if (!un.every((n) => fr.has(n.id))) return 'atras';
  if (vagasLivres(e) < un.length) return 'vagas';
  return null;
}

export const podeTocar = (e: Estado, id: number): boolean => motivoDeNaoPoder(e, id) === null;

/** Sobe o ninho (e os ligados) para as vagas livres. Retorna os eventos, ou null se o toque não vale. */
export function tocar(e: Estado, id: number): Evento[] | null {
  if (!podeTocar(e, id)) return null;
  const un = unidade(e, id)!;
  const eventos: Evento[] = [];
  for (const n of un) {
    const lugar = lugarDe(e, n.id)!;
    e.grade[lugar.linha][lugar.coluna] = null;
    const vaga = e.vagas.indexOf(null);
    e.vagas[vaga] = n;
    eventos.push({ tipo: 'subiu', id: n.id, vaga });
  }
  verificarFim(e, eventos);
  return eventos;
}

// ---------- quadradinhos expostos ----------

export interface Exposto {
  x: number;
  y: number;
  lado: Lado;
}

/** Quadradinhos da cor `cor` que estão expostos (e ainda não reservados), com os lados de onde se enxergam. */
export function expostos(e: Estado, cor: number): Exposto[] {
  const r: Exposto[] = [];
  const L = e.largura;
  const A = e.altura;
  const d = e.desenho;
  const ok = (x: number, y: number) => d[y][x] === cor && !e.reservados[`${x},${y}`];
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) if (d[y][x] >= 0) {
      if (ok(x, y)) r.push({ x, y, lado: 'esq' });
      break;
    }
    for (let x = L - 1; x >= 0; x--) if (d[y][x] >= 0) {
      if (ok(x, y)) r.push({ x, y, lado: 'dir' });
      break;
    }
  }
  for (let x = 0; x < L; x++) {
    for (let y = 0; y < A; y++) if (d[y][x] >= 0) {
      if (ok(x, y)) r.push({ x, y, lado: 'topo' });
      break;
    }
    for (let y = A - 1; y >= 0; y--) if (d[y][x] >= 0) {
      if (ok(x, y)) r.push({ x, y, lado: 'baixo' });
      break;
    }
  }
  return r;
}

/** O quadradinho exposto mais perto (pelo caminho) para uma formiga que sai de `vaga`. */
export function escolherAlvo(e: Estado, cor: number, vaga: number): Exposto | null {
  const origem = centroVaga(e.h, vaga);
  let melhor: Exposto | null = null;
  let melhorD = Infinity;
  for (const c of expostos(e, cor)) {
    const dd = comprimentoIda(e.largura, e.h, origem, c.x, c.y, c.lado);
    if (dd < melhorD - 1e-9 || (Math.abs(dd - melhorD) <= 1e-9 && melhor && (c.y < melhor.y || (c.y === melhor.y && c.x < melhor.x)))) {
      melhorD = dd;
      melhor = c;
    }
  }
  return melhor;
}

// ---------- o passo ----------

function criarFormiga(e: Estado, n: Ninho, vaga: number, alvo: Exposto): Formiga {
  const origem = centroVaga(e.h, vaga);
  const ida = caminhoIda(e.largura, e.h, origem, alvo.x, alvo.y, alvo.lado);
  const volta = caminhoVolta(e.largura, e.h, alvo.x, alvo.y, alvo.lado);
  const caminho = [...ida, ...volta.slice(1)];
  const acumulado = acumular(caminho);
  const compIda = acumulado[ida.length - 1];
  return { id: e.proximaFormiga++, ninho: n.id, cor: n.cor, fase: 'ida', alvo, caminho, acumulado, compIda, prog: 0 };
}

/** Alguma formiga já pode sair de algum ninho das vagas? */
function algumNinhoPodeSair(e: Estado): boolean {
  return e.vagas.some((n, i) => !!n && n.restam > 0 && !!escolherAlvo(e, n.cor, i));
}

function algumToqueValido(e: Estado): boolean {
  return frente(e).some((n) => podeTocar(e, n.id));
}

/** Vitória ou derrota (também depois de um toque: ninho que não alcança nada na última vaga). */
function verificarFim(e: Estado, eventos: Evento[]) {
  if (e.resultado !== 'jogando') return;
  if (e.pedacos === 0 && e.formigas.length === 0) {
    e.resultado = 'vitoria';
    eventos.push({ tipo: 'vitoria' });
  } else if (e.formigas.length === 0 && !algumNinhoPodeSair(e) && !algumToqueValido(e)) {
    e.resultado = 'derrota';
    e.motivo = 'As vagas estão cheias e nenhum ninho consegue pegar quadradinhos';
    eventos.push({ tipo: 'derrota', motivo: e.motivo });
  }
}

/** Avança 1 passo. */
export function passo(e: Estado): Evento[] {
  const eventos: Evento[] = [];
  if (e.resultado !== 'jogando') return eventos;
  e.tique++;
  // 1) formigas andam
  const chegaram: Formiga[] = [];
  for (const f of e.formigas) {
    f.prog += REGRAS.VELOCIDADE;
    if (f.fase === 'ida' && f.prog >= f.compIda) {
      f.fase = 'volta';
      e.desenho[f.alvo.y][f.alvo.x] = -1;
      delete e.reservados[`${f.alvo.x},${f.alvo.y}`];
      e.pedacos--;
      eventos.push({ tipo: 'pegou', formiga: f.id, x: f.alvo.x, y: f.alvo.y });
    }
    if (f.prog >= f.acumulado[f.acumulado.length - 1]) chegaram.push(f);
  }
  if (chegaram.length) {
    e.formigas = e.formigas.filter((f) => !chegaram.includes(f));
    for (const f of chegaram) eventos.push({ tipo: 'entregou', formiga: f.id });
  }
  // 2) ninhos soltam formigas (vagas em ordem)
  e.vagas.forEach((n, i) => {
    if (!n || n.restam <= 0) return;
    if (n.espera > 0) {
      n.espera--;
      return;
    }
    const alvo = escolherAlvo(e, n.cor, i);
    if (!alvo) return;
    e.reservados[`${alvo.x},${alvo.y}`] = true;
    const f = criarFormiga(e, n, i, alvo);
    e.formigas.push(f);
    n.restam--;
    n.espera = REGRAS.ESPERA_ENTRE_FORMIGAS - 1;
    eventos.push({ tipo: 'saiu', formiga: f.id, ninho: n.id });
  });
  // 3) ninho que soltou todas as formigas libera a vaga
  e.vagas.forEach((n, i) => {
    if (n && n.restam <= 0) {
      e.vagas[i] = null;
      eventos.push({ tipo: 'ninhoVazio', id: n.id, vaga: i });
    }
  });
  verificarFim(e, eventos);
  return eventos;
}

/** Está tudo parado? (sem formigas andando e nenhum ninho conseguindo soltar formiga) */
export function parado(e: Estado): boolean {
  return e.resultado !== 'jogando' || (e.formigas.length === 0 && !algumNinhoPodeSair(e));
}

/** Passos até tudo parar (para a IA e os testes). */
export function rodarAteParar(e: Estado, maximo = 200000): void {
  let guarda = 0;
  while (!parado(e) && guarda++ < maximo) passo(e);
}

/** Quadradinhos de uma cor que ainda restam no quadro. */
export function restantesDaCor(e: Estado, cor: number): number {
  let n = 0;
  for (const l of e.desenho) for (const c of l) if (c === cor) n++;
  return n;
}

/** Ninhos ainda por usar (na grade). */
export function ninhosNaGrade(e: Estado): Ninho[] {
  return e.grade.flat().filter((n): n is Ninho => !!n);
}
