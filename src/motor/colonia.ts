/**
 * O jogo, por "passos" (30 por segundo na velocidade 1×). Puro e determinístico (sem Math.random, sem tela).
 * As funções MEXEM no estado recebido; use `clonar` antes de guardar um "antes" (Desfazer).
 *
 * Regras:
 * - Toque num ninho da FRENTE de uma coluna: ele sobe para uma vaga livre (ninhos ligados por cano sobem juntos
 *   e precisam de vagas livres para todos).
 * - Cada ninho ativo solta formigas em leva: até 10 indo comer ao mesmo tempo, e a próxima sai quando uma pega o quadradinho. A formiga sai do buraco e escolhe o quadradinho EXPOSTO da
 *   cor do ninho mais perto (exposto = encosta, de lado, em cima ou embaixo, num espaço vazio que se liga ao lado de fora
 *   do quadro, como no Colony Flow), anda até ele pelos espaços vazios, pega e leva ao buraco. Cada quadradinho só é escolhido
 *   por uma formiga.
 * - Sem quadradinho exposto da cor dele, o ninho espera na vaga (e ocupa a vaga!).
 * - Ninho que soltou todas as formigas libera a vaga (ligados por cano: só quando todos do grupo terminaram). Quadro vazio e formigas entregues = vitória.
 * - Derrota: nenhuma formiga andando, nenhum ninho nas vagas consegue pegar nada e nenhum ninho pode subir.
 */
import { REGRAS } from './regras.ts';
import { acumular, buraco, centroVaga, pontoDaCelula } from './geometria.ts';
import type { Estado, Evento, Fase, Formiga, Ninho, Ponto } from './tipos.ts';

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
}

/**
 * O que as formigas alcançam agora: a grade com uma volta de "fora" em torno do quadro (índices -1..L e -1..A) e as
 * distâncias (em passos de célula) a partir do buraco, andando só por espaços vazios (4 direções).
 */
interface Alcance {
  /** largura da grade com a volta (L+2) */
  w: number;
  /** distância do buraco; -1 = não alcança */
  dist: Int32Array;
  /** de onde veio (índice da célula anterior); -1 no começo */
  veio: Int32Array;
}

const indice = (w: number, cx: number, cy: number) => (cy + 1) * w + (cx + 1);

const guardado = new WeakMap<Estado, { pedacos: number; a: Alcance }>();

/** Alcance com memória: só refaz quando algum quadradinho saiu (nos passos sem mudança, reaproveita). */
function alcanceAtual(e: Estado): Alcance {
  const g = guardado.get(e);
  if (g && g.pedacos === e.pedacos) return g.a;
  const a = alcance(e);
  guardado.set(e, { pedacos: e.pedacos, a });
  return a;
}

function alcance(e: Estado): Alcance {
  const L = e.largura;
  const A = e.altura;
  const w = L + 2;
  const dist = new Int32Array(w * (A + 2)).fill(-1);
  const veio = new Int32Array(w * (A + 2)).fill(-1);
  const fila = new Int32Array(w * (A + 2));
  let ini = 0;
  let fim = 0;
  const comeco = indice(w, Math.floor(L / 2), A);
  dist[comeco] = 0;
  fila[fim++] = comeco;
  while (ini < fim) {
    const cur = fila[ini++];
    const cx = (cur % w) - 1;
    const cy = Math.floor(cur / w) - 1;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < -1 || ny < -1 || nx > L || ny > A) continue;
      const ni = indice(w, nx, ny);
      if (dist[ni] >= 0) continue;
      if (nx >= 0 && nx < L && ny >= 0 && ny < A && e.desenho[ny][nx] >= 0) continue; // quadradinho: parede
      dist[ni] = dist[cur] + 1;
      veio[ni] = cur;
      fila[fim++] = ni;
    }
  }
  return { w, dist, veio };
}

const VIZINHOS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Menor distância (em células) até chegar ao lado de uma célula: a célula vizinha alcançada mais perto, ou -1. */
function vizinhoMaisPerto(e: Estado, a: Alcance, x: number, y: number): number {
  let melhor = -1;
  for (const [dx, dy] of VIZINHOS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < -1 || ny < -1 || nx > e.largura || ny > e.altura) continue;
    const i = indice(a.w, nx, ny);
    if (a.dist[i] >= 0 && (melhor < 0 || a.dist[i] < a.dist[melhor])) melhor = i;
  }
  return melhor;
}

/** Quadradinhos da cor `cor` que estão expostos (e ainda não reservados). */
export function expostos(e: Estado, cor: number, a: Alcance = alcance(e)): Exposto[] {
  const r: Exposto[] = [];
  for (let y = 0; y < e.altura; y++)
    for (let x = 0; x < e.largura; x++)
      if (e.desenho[y][x] === cor && !e.reservados[`${x},${y}`] && vizinhoMaisPerto(e, a, x, y) >= 0) r.push({ x, y });
  return r;
}

/**
 * O quadradinho exposto da cor `cor` que a formiga vai pegar, sempre na mesma ordem (como no Colony Flow):
 * a fileira MAIS BAIXA primeiro e, dentro da fileira, da ESQUERDA para a DIREITA.
 */
function escolherAlvo(e: Estado, cor: number, a: Alcance): { alvo: Exposto; de: number } | null {
  for (let y = e.altura - 1; y >= 0; y--)
    for (let x = 0; x < e.largura; x++) {
      if (e.desenho[y][x] !== cor || e.reservados[`${x},${y}`]) continue;
      const de = vizinhoMaisPerto(e, a, x, y);
      if (de >= 0) return { alvo: { x, y }, de };
    }
  return null;
}

// ---------- caminho das formigas ----------

/** A reta entre dois centros de célula (em unidades de célula) só passa por espaço vazio, com um pouco de folga? */
function retaLivre(e: Estado, ax: number, ay: number, bx: number, by: number): boolean {
  const L = e.largura;
  const A = e.altura;
  const livre = (gx: number, gy: number) => {
    const cx = Math.floor(gx);
    const cy = Math.floor(gy);
    return cx < 0 || cy < 0 || cx >= L || cy >= A || e.desenho[cy][cx] < 0;
  };
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(len * 4));
  const px = -dy / (len || 1) * 0.3;
  const py = dx / (len || 1) * 0.3;
  for (let i = 0; i <= n; i++) {
    const gx = ax + (dx * i) / n;
    const gy = ay + (dy * i) / n;
    if (!livre(gx, gy) || !livre(gx + px, gy + py) || !livre(gx - px, gy - py)) return false;
  }
  return true;
}

/** Pontos (em larguras do quadro) do buraco até o quadradinho: pelos vazios, esticando o caminho onde dá. */
function rotaDoBuraco(e: Estado, a: Alcance, de: number, alvo: Exposto): Ponto[] {
  const cels: [number, number][] = [];
  for (let i = de; i >= 0; i = a.veio[i]) cels.push([(i % a.w) - 1, Math.floor(i / a.w) - 1]);
  cels.reverse(); // do buraco até o lado do alvo
  const g = (c: [number, number]): [number, number] => [c[0] < 0 ? -0.5 : c[0] >= e.largura ? e.largura + 0.5 : c[0] + 0.5, c[1] < 0 ? -0.5 : c[1] >= e.altura ? e.altura + 0.5 : c[1] + 0.5];
  const esticado: [number, number][] = [cels[0]];
  let i = 0;
  while (i < cels.length - 1) {
    let j = cels.length - 1;
    const [ax, ay] = g(cels[i]);
    while (j > i + 1) {
      const [bx, by] = g(cels[j]);
      if (retaLivre(e, ax, ay, bx, by)) break;
      j--;
    }
    esticado.push(cels[j]);
    i = j;
  }
  const pts = esticado.map(([cx, cy]) => pontoDaCelula(e.largura, e.altura, cx, cy));
  pts.push(pontoDaCelula(e.largura, e.altura, alvo.x, alvo.y));
  return pts;
}

// ---------- o passo ----------

function criarFormiga(e: Estado, a: Alcance, n: Ninho, vaga: number, alvo: Exposto, de: number): Formiga {
  const fora = rotaDoBuraco(e, a, de, alvo);
  const ida: Ponto[] = [centroVaga(e.h, vaga), buraco(e.h), ...fora];
  const volta = [...fora].reverse().slice(1);
  const caminho = [...ida, ...volta, buraco(e.h)];
  const acumulado = acumular(caminho);
  const compIda = acumulado[ida.length - 1];
  return { id: e.proximaFormiga++, ninho: n.id, cor: n.cor, fase: 'ida', alvo, caminho, acumulado, compIda, prog: 0 };
}

/** Alguma formiga já pode sair de algum ninho das vagas? */
function algumNinhoPodeSair(e: Estado): boolean {
  const a = alcanceAtual(e);
  return e.vagas.some((n) => !!n && n.restam > 0 && !!escolherAlvo(e, n.cor, a));
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
    e.motivo = vagasLivres(e) > 0 ? 'Não há vagas livres para os ninhos ligados por cano' : 'As vagas estão cheias e nenhum ninho consegue pegar quadradinhos';
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
  const a = alcanceAtual(e);
  e.vagas.forEach((n, i) => {
    if (!n || n.restam <= 0) return;
    if (n.espera > 0) {
      n.espera--;
      return;
    }
    if (e.formigas.filter((f) => f.ninho === n.id && f.fase === 'ida').length >= REGRAS.MAX_INDO) return; // leva cheia: espera uma pegar
    const escolha = escolherAlvo(e, n.cor, a);
    if (!escolha) return;
    const { alvo, de } = escolha;
    e.reservados[`${alvo.x},${alvo.y}`] = true;
    const f = criarFormiga(e, a, n, i, alvo, de);
    e.formigas.push(f);
    n.restam--;
    n.espera = REGRAS.ESPERA_ENTRE_FORMIGAS - 1;
    eventos.push({ tipo: 'saiu', formiga: f.id, ninho: n.id });
  });
  // 3) ninho que soltou todas as formigas libera a vaga
  // (ninhos ligados por cano ficam nas vagas até TODOS do grupo terminarem)
  const terminou = (n: Ninho) => n.restam <= 0 && (n.grupo === undefined || e.vagas.every((o) => !o || o.grupo !== n.grupo || o.restam <= 0));
  const liberar = e.vagas.map((n) => !!n && terminou(n));
  e.vagas.forEach((n, i) => {
    if (n && liberar[i]) {
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
