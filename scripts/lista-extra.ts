/**
 * Fases EXTRA (ids 71 em diante): mais desenhos para os 4 níveis, feitos por código (padrões) e por retalhos/recolorindo os
 * desenhos à mão. Meta final: Fácil 50, Médio 50, Difícil 200, Desafio 200 (as 70 primeiras fases já estão no jogo).
 * Tudo é determinístico (sementes fixas). Cada nível ganha: facil 40, medio 40, dificil 180, desafio 170 novas.
 * Os ids já publicados (1–70) NÃO mudam, para não bagunçar o progresso guardado; estas entram no FIM de cada nível.
 */
import { DESENHOS_MEDIOS, DESENHOS_PEQUENOS } from '../src/fases/desenhos.ts';
import {
  aneis, arlequim, chevron, coresN, coresUsadas, confete, espiral, ladrilhos, listras, molduras, ondas, raios, tartan, vitral, xadrez, zigzag,
} from '../src/fases/geradores.ts';
import type { Grupo } from '../src/motor/tipos.ts';
import { mulberry32, type Entrada } from './gerador.ts';
import { desenho, entradas as entradasBase, medio, parametrosDe, pequeno } from './lista-fases.ts';

export const META_EXTRA: Record<Grupo, number> = { facil: 40, medio: 40, dificil: 180, desafio: 170 };
const PRIMEIRO_ID = 71;

/** Faixas de tamanho e de cores de cada nível (as mesmas que o teste das fases confere). */
const FAIXAS: Record<Grupo, { w: [number, number]; h: [number, number]; cores: [number, number] }> = {
  facil: { w: [24, 36], h: [18, 36], cores: [3, 4] },
  medio: { w: [30, 40], h: [24, 38], cores: [4, 6] },
  dificil: { w: [36, 48], h: [26, 40], cores: [6, 8] },
  desafio: { w: [30, 48], h: [26, 40], cores: [5, 11] },
};
const NOMES_PEQUENOS = DESENHOS_PEQUENOS.map((d) => d.nome);
const NOMES_MEDIOS = DESENHOS_MEDIOS.map((d) => d.nome);
const FUNDOS = ['c', 'b', 'p', 'g', 'k', 'o', 'y', 'm', 'w', 'd', 'r'];

type Rng = () => number;
const entre = (rng: Rng, a: number, b: number, passo = 1) => a + Math.floor(rng() * (Math.floor((b - a) / passo) + 1)) * passo;
const escolha = <T>(rng: Rng, v: T[]): T => v[Math.floor(rng() * v.length)];
const ROMANO = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

interface Candidato {
  nome: string;
  linhas: string[];
}

/** Um desenho novo para o nível `g`, ou null se este sorteio não serviu. */
function sortear(g: Grupo, rng: Rng, n: number, contagem: Map<string, number>): Candidato | null {
  const f = FAIXAS[g];
  const w = entre(rng, f.w[0], f.w[1], 2);
  const h = entre(rng, f.h[0], f.h[1], 2);
  const nc = entre(rng, f.cores[0], g === 'desafio' ? Math.min(f.cores[1], 11) : f.cores[1]);
  const giro = entre(rng, 0, nc - 1);
  const cores = coresN(nc, giro);
  const familias = [
    'Listras', 'Xadrez', 'Anéis', 'Espiral', 'Tijolinhos', 'Vitral', 'Zigue-zague', 'Setas', 'Arlequim', 'Tartan', 'Molduras', 'Raios', 'Ondas', 'Confete',
    'Retalhos pequeno', 'Retalhos médio', 'Recolorido pequeno', 'Recolorido médio',
  ];
  let fam = escolha(rng, familias);
  // recolorir só serve para os níveis fáceis (desenho à mão com fundo diferente)
  if ((fam === 'Recolorido pequeno' || fam === 'Recolorido médio') && g !== 'facil' && g !== 'medio') fam = 'Retalhos pequeno';
  if (fam === 'Retalhos pequeno' && g === 'facil') fam = 'Recolorido pequeno';
  if ((fam === 'Retalhos pequeno' || fam === 'Retalhos médio') && (g === 'facil' || g === 'medio')) fam = g === 'facil' ? 'Recolorido pequeno' : 'Recolorido médio';
  if (fam === 'Recolorido pequeno' && g === 'medio') fam = 'Recolorido médio';
  if (fam === 'Recolorido médio' && g === 'facil') fam = 'Recolorido pequeno';
  let linhas: string[];
  let base = fam;
  const semente = Math.floor(rng() * 1e6);
  switch (fam) {
    case 'Listras': linhas = listras(w, h, cores, entre(rng, 2, 5)); break;
    case 'Xadrez': linhas = xadrez(w, h, cores, entre(rng, 2, 5)); break;
    case 'Anéis': {
      const forma = escolha(rng, ['losango', 'quadrado', 'circulo'] as const);
      linhas = aneis(w, h, cores, forma, entre(rng, 2, 4) + (rng() < 0.5 ? 0.5 : 0));
      base = forma === 'losango' ? 'Losangos' : forma === 'quadrado' ? 'Alvo' : 'Círculos';
      break;
    }
    case 'Espiral': linhas = espiral(w, h, cores, entre(rng, 2, 6), entre(rng, 2, 5)); base = 'Redemoinho'; break;
    case 'Tijolinhos': linhas = ladrilhos(w, h, cores, semente, entre(rng, 3, 7), entre(rng, 2, 4)); break;
    case 'Vitral': linhas = vitral(w, h, cores, semente, rng() < 0.6, entre(rng, 14, 26)); break;
    case 'Zigue-zague': linhas = zigzag(w, h, cores, entre(rng, 6, 14), entre(rng, 2, 4)); break;
    case 'Setas': linhas = chevron(w, h, cores, entre(rng, 2, 4)); break;
    case 'Arlequim': linhas = arlequim(w, h, cores, entre(rng, 5, 10)); break;
    case 'Tartan': linhas = tartan(w, h, cores, Array.from({ length: entre(rng, nc, nc + 2) }, (_, i) => [i % nc, entre(rng, 2, 5)] as [number, number])); break;
    case 'Molduras': linhas = molduras(w, h, cores, entre(rng, 2, 4)); break;
    case 'Raios': linhas = raios(w, h, cores, entre(rng, 6, 12), entre(rng, 0, 3)); break;
    case 'Ondas': linhas = ondas(w, h, cores, entre(rng, 2, 4), entre(rng, 8, 16), entre(rng, 2, 4)); break;
    case 'Confete': linhas = confete(w, h, cores, semente, 0.12 + rng() * 0.2); break;
    case 'Recolorido pequeno': {
      const nome = escolha(rng, NOMES_PEQUENOS);
      linhas = desenho(pequeno(nome), 3, { fundo: escolha(rng, FUNDOS) });
      base = nome;
      break;
    }
    case 'Recolorido médio': {
      const nome = escolha(rng, NOMES_MEDIOS);
      linhas = desenho(medio(nome), 2, { pad: 2, fundo: escolha(rng, FUNDOS) });
      base = nome;
      break;
    }
    case 'Retalhos pequeno': {
      const nome = escolha(rng, NOMES_PEQUENOS);
      linhas = desenho(pequeno(nome), entre(rng, 3, 4), { pad: entre(rng, 0, 1), retal: entre(rng, 2, 3), semente, fundo: escolha(rng, FUNDOS) });
      base = `${nome} de retalhos`;
      break;
    }
    default: {
      const nome = escolha(rng, NOMES_MEDIOS);
      linhas = desenho(medio(nome), entre(rng, 2, 3), { pad: entre(rng, 0, 2), retal: entre(rng, 2, 3), semente, fundo: escolha(rng, FUNDOS) });
      base = `${nome} de retalhos`;
    }
  }
  const largura = linhas[0].length;
  const altura = linhas.length;
  const usadas = coresUsadas(linhas).length;
  if (largura < f.w[0] || largura > f.w[1] || altura < 18 || altura > 46 || usadas < f.cores[0] || usadas > f.cores[1]) return null;
  const k = (contagem.get(base) ?? 0) + 1;
  contagem.set(base, k);
  void n;
  return { nome: `${base}${k <= 10 ? ROMANO[k - 1] : ` ${k}`}`, linhas };
}

/** As fases extra (ids 71…), por nível, em ordem de dificuldade crescente (mais cores e maior primeiro no fim). */
export function entradasExtra(): Entrada[] {
  const porNivel: Record<Grupo, Candidato[]> = { facil: [], medio: [], dificil: [], desafio: [] };
  const NIVEIS: Grupo[] = ['facil', 'medio', 'dificil', 'desafio'];
  const vistos = new Set<string>();
  // nomes já usados nas 70 primeiras fases entram na contagem, para os novos continuarem a numeração ("Mandala VIII"…)
  const contagem = new Map<string, number>();
  for (const g of NIVEIS) {
    const rng = mulberry32(7000 + NIVEIS.indexOf(g) * 101);
    let tentativas = 0;
    while (porNivel[g].length < META_EXTRA[g] && tentativas++ < 20000) {
      const c = sortear(g, rng, tentativas, contagem);
      if (!c) continue;
      const chave = c.linhas.join('/');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      porNivel[g].push(c);
    }
  }
  // nenhum nome repetido (nem com as 70 fases que já estão no jogo)
  const usados = new Set(entradasBase().map((e) => e.nome));
  const r: Entrada[] = [];
  let id = PRIMEIRO_ID - 1;
  for (const g of NIVEIS) {
    // mais fáceis primeiro: menos cores, depois menor área
    const lista = porNivel[g].sort((a, b) => coresUsadas(a.linhas).length - coresUsadas(b.linhas).length || a.linhas.length * a.linhas[0].length - b.linhas.length * b.linhas[0].length);
    for (const c of lista) {
      id++;
      let nome = c.nome;
      for (let k = 2; usados.has(nome); k++) nome = `${c.nome} ${k}`;
      usados.add(nome);
      r.push({
        id,
        grupo: g,
        nome,
        linhas: c.linhas,
        colunas: g === 'facil' || g === 'medio' ? 3 : 4,
        semente: 1000 + id * 31,
        param: parametrosDe(g, 40),
        partidas: 60,
      });
    }
  }
  return r;
}
