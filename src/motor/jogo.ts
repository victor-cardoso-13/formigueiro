/**
 * O jogo por "passos", puro e determinístico (sem tela, sem Math.random).
 * As funções MEXEM no estado recebido (rápido para a IA e os testes); use `clonar` antes de guardar um "antes".
 */
import { REGRAS } from './regras.ts';
import { alvo, trilha } from './trilha.ts';
import type { Celula, Estado, Evento, Fase, Formiga, FormigaNaTrilha, Origem } from './tipos.ts';

export function novoEstado(fase: Fase): Estado {
  const folhas = new Set(fase.folhas.map(([x, y]) => `${x},${y}`));
  const duros = new Set(fase.duros.map(([x, y]) => `${x},${y}`));
  let pedacos = 0;
  const desenho = fase.desenho.map((linha, y) =>
    [...linha].map((ch, x): Celula | null => {
      if (ch === '.') return null;
      pedacos++;
      const duro = duros.has(`${x},${y}`);
      return { cor: parseInt(ch, 36), duro, mordidas: duro ? REGRAS.MORDIDAS_TORRAO : 1, folha: folhas.has(`${x},${y}`) };
    }),
  );
  let id = 1;
  const colunas = fase.colunas.map((col) =>
    col.map((f): Formiga => {
      const formiga: Formiga = { id: id++, cor: f.cor, fome: f.fome };
      if (f.dorme) formiga.dorme = REGRAS.SAIDAS_PARA_ACORDAR;
      return formiga;
    }),
  );
  const e: Estado = {
    largura: fase.largura,
    altura: fase.altura,
    desenho,
    colunas,
    espera: Array.from({ length: REGRAS.LUGARES_ESPERA }, () => null),
    trilha: [],
    saidas: 0,
    passo: 0,
    pedacos,
    resultado: 'jogando',
  };
  verificarTravado(e);
  return e;
}

export function clonar(e: Estado): Estado {
  return structuredClone(e);
}

export const toqueDe = (o: Origem): number => ('coluna' in o ? o.coluna : REGRAS.BASE_ESPERA + o.espera);
export const origemDe = (n: number): Origem =>
  n >= REGRAS.BASE_ESPERA ? { espera: n - REGRAS.BASE_ESPERA } : { coluna: n };

/** A formiga que está nessa origem (ou undefined). */
export function formigaEm(e: Estado, o: Origem): Formiga | undefined {
  return 'coluna' in o ? e.colunas[o.coluna]?.[0] : (e.espera[o.espera] ?? undefined);
}

export function entradaLivre(e: Estado): boolean {
  return !e.trilha.some((t) => t.pos === 0);
}

export function podeTocar(e: Estado, o: Origem): boolean {
  if (e.resultado !== 'jogando') return false;
  if (e.trilha.length >= REGRAS.MAX_NA_TRILHA || !entradaLivre(e)) return false;
  const f = formigaEm(e, o);
  return !!f && !(f.dorme && f.dorme > 0);
}

/** Manda a formiga para a trilha. Retorna os eventos, ou null se o toque foi ignorado (a tela faz a "tremidinha"). */
export function tocar(e: Estado, o: Origem): Evento[] | null {
  if (!podeTocar(e, o)) return null;
  const eventos: Evento[] = [];
  let f: Formiga;
  if ('coluna' in o) {
    // As dorminhocas que JÁ estavam na frente de outra coluna contam esta saída (a que acabou de chegar à frente, não).
    const dormindo = e.colunas.map((c) => c[0]).filter((x): x is Formiga => !!x && !!x.dorme);
    f = e.colunas[o.coluna].shift()!;
    e.saidas++;
    for (const d of dormindo) {
      d.dorme = d.dorme! - 1;
      if (d.dorme <= 0) {
        delete d.dorme;
        eventos.push({ tipo: 'acordou', id: d.id });
      }
    }
  } else {
    f = e.espera[o.espera]!;
    e.espera[o.espera] = null;
  }
  e.trilha.push({ formiga: f, pos: 0, origem: o });
  eventos.unshift({ tipo: 'entrou', id: f.id, origem: o });
  verificarTravado(e);
  return eventos;
}

/** Sem formiga nenhuma que possa sair (todas as da frente dormindo e espera vazia) = travado. */
function verificarTravado(e: Estado) {
  if (e.resultado !== 'jogando' || e.trilha.length > 0 || e.pedacos === 0) return;
  const algumaPode = e.colunas.some((c) => c[0] && !c[0].dorme) || e.espera.some((f) => !!f);
  if (!algumaPode) {
    e.resultado = 'travado';
    e.motivo = 'Nenhuma formiga pode sair agora';
  }
}

function derrubarFolhas(e: Estado, x: number, y: number, eventos: Evento[]) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c = e.desenho[y + dy]?.[x + dx];
    if (c && c.folha) {
      c.folha = false;
      eventos.push({ tipo: 'folhaCaiu', x: x + dx, y: y + dy });
    }
  }
}

/** A formiga (já na posição nova) olha para dentro e, se puder, come 1 pedacinho. */
function comer(e: Estado, ft: FormigaNaTrilha, eventos: Evento[]) {
  const p = trilha(e.largura, e.altura)[ft.pos];
  const a = alvo(e.desenho, e.largura, e.altura, p);
  if (!a) return;
  const c = e.desenho[a.y][a.x]!;
  if (c.cor !== ft.formiga.cor || c.folha) return; // outra cor: passa direto (não pula para o de trás)
  ft.formiga.fome--;
  c.mordidas--;
  if (c.mordidas <= 0) {
    e.desenho[a.y][a.x] = null;
    e.pedacos--;
    eventos.push({ tipo: 'comeu', id: ft.formiga.id, x: a.x, y: a.y, sumiu: true });
    derrubarFolhas(e, a.x, a.y, eventos);
  } else {
    eventos.push({ tipo: 'comeu', id: ft.formiga.id, x: a.x, y: a.y, sumiu: false });
  }
}

/** Avança 1 passo: todas as formigas da trilha andam 1 célula (a mais antiga primeiro) e comem. */
export function passo(e: Estado): Evento[] {
  const eventos: Evento[] = [];
  if (e.resultado !== 'jogando') return eventos;
  e.passo++;
  const volta = trilha(e.largura, e.altura).length;
  for (const ft of [...e.trilha]) {
    ft.pos++;
    if (ft.pos >= volta) {
      // terminou a volta
      e.trilha.splice(e.trilha.indexOf(ft), 1);
      const lugar = e.espera.indexOf(null);
      if (lugar < 0) {
        e.resultado = 'derrota';
        e.motivo = 'As formigas não têm onde esperar';
        eventos.push({ tipo: 'derrota', motivo: e.motivo });
        return eventos;
      }
      e.espera[lugar] = ft.formiga;
      eventos.push({ tipo: 'esperou', id: ft.formiga.id, lugar });
      continue;
    }
    comer(e, ft, eventos);
    if (e.pedacos === 0) {
      e.resultado = 'vitoria';
      e.trilha = []; // as formigas voltam para casa felizes
      eventos.push({ tipo: 'vitoria' });
      return eventos;
    }
    if (ft.formiga.fome <= 0) {
      e.trilha.splice(e.trilha.indexOf(ft), 1);
      eventos.push({ tipo: 'foiEmbora', id: ft.formiga.id });
    }
  }
  verificarTravado(e);
  return eventos;
}

/** Passos até a trilha esvaziar (ou o jogo acabar). Para IA e testes. */
export function rodarAteParar(e: Estado): void {
  let guarda = 0;
  while (e.trilha.length > 0 && e.resultado === 'jogando' && guarda++ < 100000) passo(e);
}

export const resultado = (e: Estado) => e.resultado;

/** Pedacinhos "à vista" da trilha (o primeiro de cada linha/coluna vista de cada lado). */
export function pedacosAVista(e: Estado): { x: number; y: number }[] {
  const vistos = new Set<string>();
  const lista: { x: number; y: number }[] = [];
  for (const p of trilha(e.largura, e.altura)) {
    const a = alvo(e.desenho, e.largura, e.altura, p);
    if (a && !vistos.has(`${a.x},${a.y}`)) {
      vistos.add(`${a.x},${a.y}`);
      lista.push(a);
    }
  }
  return lista;
}

/**
 * "👀 N": quantos pedacinhos essa formiga comeria se saísse agora, sozinha (simula uma volta num desenho copiado),
 * e quais pedacinhos da cor dela estão à vista da trilha agora (para o contorno brilhante).
 */
export function previsao(e: Estado, o: Origem): { comeria: number; celulasAVista: { x: number; y: number }[] } {
  const f = formigaEm(e, o);
  if (!f || (f.dorme && f.dorme > 0)) return { comeria: 0, celulasAVista: [] };
  const celulasAVista = pedacosAVista(e).filter((p) => {
    const c = e.desenho[p.y][p.x]!;
    return c.cor === f.cor && !c.folha;
  });
  const fSim: Formiga = { id: f.id, cor: f.cor, fome: f.fome };
  const sim: Estado = {
    largura: e.largura,
    altura: e.altura,
    desenho: e.desenho.map((l) => l.map((c) => (c ? { ...c } : null))),
    colunas: [[fSim]],
    espera: [null],
    trilha: [],
    saidas: 0,
    passo: 0,
    pedacos: e.pedacos,
    resultado: 'jogando',
  };
  tocar(sim, { coluna: 0 });
  rodarAteParar(sim);
  return { comeria: f.fome - fSim.fome, celulasAVista };
}
