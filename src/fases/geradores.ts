/**
 * Desenhos feitos por código (mosaicos, vitrais, anéis, espirais, listras, xadrez, ladrilhos) e ajudantes
 * para ampliar/espelhar/sombrear desenhos à mão. Tudo determinístico (semente fixa); o resultado é congelado em fases.json.
 */
function mulberry32(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ordem em que as cores entram (as primeiras são as mais diferentes entre si). */
const ORDEM_CORES = ['r', 'b', 'y', 'g', 'p', 'o', 'c', 'k', 'm', 'd', 'w'];
export function coresN(n: number, giro = 0): string[] {
  const base = ORDEM_CORES.slice(0, n);
  return base.map((_, i) => base[(i + giro) % n]);
}

const grade = (w: number, h: number, f: (x: number, y: number) => string) =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)).join(''));

/** Deixa todas as linhas com a mesma largura (completa com vazio à direita). */
export function normalizar(linhas: string[]): string[] {
  const w = Math.max(...linhas.map((l) => l.length));
  return linhas.map((l) => l.padEnd(w, '.'));
}

/** Espelha: a linha dada é a metade esquerda; a última coluna fica junto do meio. */
export function espelhar(metade: string[]): string[] {
  return metade.map((l) => l + [...l].reverse().join(''));
}

/** Amplia por inteiro (cada pedacinho vira f×f). */
export function ampliar(linhas: string[], f: number): string[] {
  const r: string[] = [];
  for (const l of linhas) {
    const g = [...l].map((c) => c.repeat(f)).join('');
    for (let i = 0; i < f; i++) r.push(g);
  }
  return r;
}

/** Colcha de retalhos: dentro de cada bloco b×b, as cores do desenho podem trocar por uma "prima" (mais cores, mesmo desenho). */
export function retalhos(linhas: string[], primas: Record<string, string[]>, b: number, semente: number): string[] {
  const hash = (x: number, y: number, c: string) => {
    const r = mulberry32(((x * 73856093) ^ (y * 19349663) ^ (c.charCodeAt(0) * 83492791) ^ semente) >>> 0);
    return r();
  };
  return linhas.map((l, y) =>
    [...l]
      .map((c, x) => {
        if (c === '.') return c;
        const opcoes = [c, ...(primas[c] ?? [])];
        return opcoes[Math.floor(hash(Math.floor(x / b), Math.floor(y / b), c) * opcoes.length)];
      })
      .join(''),
  );
}

export function listras(w: number, h: number, cores: string[], largura = 2): string[] {
  return grade(w, h, (x, y) => cores[Math.floor((x + y) / largura) % cores.length]);
}

export function xadrez(w: number, h: number, cores: string[], b = 2): string[] {
  return grade(w, h, (x, y) => cores[(Math.floor(x / b) + Math.floor(y / b)) % cores.length]);
}

export function aneis(w: number, h: number, cores: string[], forma: 'losango' | 'quadrado' | 'circulo', largura = 2): string[] {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return grade(w, h, (x, y) => {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    const d = forma === 'losango' ? dx + dy : forma === 'quadrado' ? Math.max(dx, dy) : Math.hypot(dx, dy);
    return cores[Math.floor(d / largura) % cores.length];
  });
}

export function espiral(w: number, h: number, cores: string[], bracos = 3, passo = 3): string[] {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return grade(w, h, (x, y) => {
    const a = Math.atan2(y - cy, x - cx) / (Math.PI * 2) + 0.5;
    const r = Math.hypot(x - cx, y - cy);
    return cores[Math.floor(a * bracos + r / passo) % cores.length];
  });
}

export function ladrilhos(w: number, h: number, cores: string[], semente: number, bw = 4, bh = 2): string[] {
  const rng = mulberry32(semente);
  const tabela = Array.from({ length: 64 }, () => Math.floor(rng() * cores.length));
  return grade(w, h, (x, y) => {
    const r = Math.floor(y / bh);
    const off = (r % 2) * Math.floor(bw / 2);
    const bx = Math.floor((x + off) / bw);
    return cores[(tabela[(bx * 7 + r * 13) % 64] + (r % 3)) % cores.length];
  });
}

/** Vitral: cada pedacinho tem a cor da "semente" mais próxima. espelho=true deixa simétrico (mandala). */
export function vitral(w: number, h: number, cores: string[], semente: number, espelho: boolean, densidade = 16): string[] {
  const rng = mulberry32(semente);
  const n = Math.max(cores.length, Math.round((w * h) / densidade / (espelho ? 4 : 1)));
  const sementes: { x: number; y: number; c: string }[] = [];
  const ordem = [...cores];
  for (let i = 0; i < n; i++) {
    const c = ordem[i % ordem.length];
    const x = espelho ? rng() * (w / 2) : rng() * w;
    const y = espelho ? rng() * (h / 2) : rng() * h;
    sementes.push({ x, y, c });
    if (espelho) {
      sementes.push({ x: w - 1 - x, y, c });
      sementes.push({ x, y: h - 1 - y, c });
      sementes.push({ x: w - 1 - x, y: h - 1 - y, c });
    }
  }
  return grade(w, h, (x, y) => {
    let melhor = Infinity;
    let cor = cores[0];
    for (const s of sementes) {
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < melhor) {
        melhor = d;
        cor = s.c;
      }
    }
    return cor;
  });
}

/** Recorta o desenho em círculo ou losango (cantos ficam vazios). */
export function recortar(linhas: string[], forma: 'circulo' | 'losango'): string[] {
  const h = linhas.length;
  const w = linhas[0].length;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return linhas.map((l, y) =>
    [...l]
      .map((c, x) => {
        const nx = (x - cx) / (w / 2);
        const ny = (y - cy) / (h / 2);
        const dentro = forma === 'circulo' ? nx * nx + ny * ny <= 1.02 : Math.abs(nx) + Math.abs(ny) <= 1.15;
        return dentro ? c : '.';
      })
      .join(''),
  );
}

// ---------- ajudantes e padrões novos (quadros grandes, "Colony Flow") ----------

/** Troca os lugares vazios ('.') pela cor de fundo `bg`; `pad` = quantas linhas/colunas de fundo acrescentar em volta. */
export function comFundo(linhas: string[], bg: string, pad = 0): string[] {
  const w = linhas[0].length + 2 * pad;
  const miolo = linhas.map((l) => bg.repeat(pad) + l.replaceAll('.', bg) + bg.repeat(pad));
  const borda = Array.from({ length: pad }, () => bg.repeat(w));
  return [...borda, ...miolo, ...borda];
}

/** Letras de cor usadas num desenho (sem o '.'). */
export const coresUsadas = (linhas: string[]): string[] => [...new Set(linhas.join('').replaceAll('.', ''))];

/** Espelha na horizontal (inverte cada linha). */
export const inverter = (linhas: string[]): string[] => linhas.map((l) => [...l].reverse().join(''));

/** Ondas horizontais: faixas de cor que sobem e descem. */
export function ondas(w: number, h: number, cores: string[], amplitude = 3, periodo = 12, faixa = 3): string[] {
  return grade(w, h, (x, y) => {
    const d = y + amplitude * Math.sin((x / periodo) * Math.PI * 2);
    return cores[((Math.floor(d / faixa) % cores.length) + cores.length) % cores.length];
  });
}

/** Setas (chevrons) apontando para cima. */
export function chevron(w: number, h: number, cores: string[], faixa = 3): string[] {
  const cx = (w - 1) / 2;
  return grade(w, h, (x, y) => cores[Math.floor((Math.abs(x - cx) + y) / faixa) % cores.length]);
}

/** Zigue-zague. */
export function zigzag(w: number, h: number, cores: string[], periodo = 8, faixa = 3): string[] {
  return grade(w, h, (x, y) => {
    const m = x % periodo;
    const tri = m < periodo / 2 ? m : periodo - m;
    return cores[Math.floor((y + tri) / faixa) % cores.length];
  });
}

/** Raios de sol: setores de cor ao redor do centro (com um miolo de outra cor). */
export function raios(w: number, h: number, cores: string[], setores = 8, miolo = 0): string[] {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return grade(w, h, (x, y) => {
    const r = Math.hypot(x - cx, y - cy);
    if (miolo > 0 && r < miolo) return cores[cores.length - 1];
    const a = Math.atan2(y - cy, x - cx) / (Math.PI * 2) + 0.5;
    return cores[Math.floor(a * setores) % Math.max(1, cores.length - (miolo > 0 ? 1 : 0))];
  });
}

/** Xadrez de losangos (arlequim): o fundo alterna as 2 primeiras cores; os losangos usam as outras, uma por casa. */
export function arlequim(w: number, h: number, cores: string[], p = 8): string[] {
  const losangos = cores.length > 2 ? cores.slice(2) : cores;
  return grade(w, h, (x, y) => {
    const dx = Math.abs((x % p) - (p - 1) / 2);
    const dy = Math.abs((y % p) - (p - 1) / 2);
    const q = Math.floor(x / p) + Math.floor(y / p) * 2;
    return dx + dy <= (p - 1) / 2 ? losangos[q % losangos.length] : cores[(Math.floor(x / p) + Math.floor(y / p)) % 2];
  });
}

/** Xadrez escocês: faixas que se cruzam. `padrao` = lista de [corIndice, largura]. */
export function tartan(w: number, h: number, cores: string[], padrao: [number, number][]): string[] {
  const seq: number[] = [];
  for (const [c, n] of padrao) for (let i = 0; i < n; i++) seq.push(c);
  const p = seq.length;
  return grade(w, h, (x, y) => {
    const a = seq[x % p];
    const b = seq[y % p];
    return cores[a === b ? a : (a + b) % cores.length];
  });
}

/** Quadros dentro de quadros (molduras) com um desenho de cor viva no meio. */
export function molduras(w: number, h: number, cores: string[], faixa = 2): string[] {
  return grade(w, h, (x, y) => {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y);
    return cores[Math.floor(d / faixa) % cores.length];
  });
}

/** Estrelinhas/pontos espalhados em um fundo (semente fixa); `fundo` é a 1ª cor. */
export function confete(w: number, h: number, cores: string[], semente: number, densidade = 0.18): string[] {
  const rng = mulberry32(semente);
  return grade(w, h, () => (rng() < densidade ? cores[1 + Math.floor(rng() * (cores.length - 1))] : cores[0]));
}

/** Manchas (vitral) com dois tons por mancha: dá mais cores sem perder o desenho. Cantos arredondados em `circulo`. */
export function medalhao(linhas: string[], bg: string, forma: 'circulo' | 'losango' = 'circulo'): string[] {
  return comFundo(recortar(linhas, forma), bg);
}
