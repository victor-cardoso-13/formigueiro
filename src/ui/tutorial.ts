/** Como jogar: 6 passos curtos com desenhos no visual do jogo (azul-arroxeado), "Pular" sempre visível. */
import { PALETA } from '../fases/paleta.ts';
import { formigaSvg } from './formiga.ts';

const P = (i: number) => PALETA[i];
/** contorno escuro (o mesmo do jogo) */
const ESC = '#262340';

/** Quadradinho de açúcar (como no quadro do jogo). */
function quad(x: number, y: number, c: number, s: number, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.2}" fill="${P(c).cor}" stroke="${P(c).escura}" stroke-width="1.2" ${extra}/>`;
}

/** Número branco com contorno escuro, centrado em (cx,cy). */
function numero(cx: number, cy: number, fs: number, t: string | number, extra = ''): string {
  return `<text x="${cx}" y="${cy + fs * 0.36}" text-anchor="middle" font-size="${fs}" fill="#fff" stroke="${ESC}" stroke-width="${Math.max(3, fs * 0.22)}" paint-order="stroke" stroke-linejoin="round" ${extra}>${t}</text>`;
}

/**
 * Ninho como no jogo: bloco arredondado de cor uniforme, fio branco, contorno escuro e número branco.
 * (x,y) = canto de cima à esquerda; s = lado. `atras` = fileira de trás (esmaecido); cor -1 = misterioso ("?" cinza).
 */
function ninho(x: number, y: number, s: number, cor: number, n: number | string, atras = false): string {
  const r = s * 0.22;
  const mist = cor < 0;
  const fundo = mist ? '#9a9fc4' : P(cor).cor;
  const fs = Math.round(s * (String(n).length > 1 ? 0.42 : 0.52));
  return `<g${atras ? ' opacity=".8"' : ''}>
    <rect x="${x}" y="${y + 4}" width="${s}" height="${s}" rx="${r}" fill="#14142e" opacity=".3"/>
    <rect x="${x - 2}" y="${y - 2}" width="${s + 4}" height="${s + 4}" rx="${r + 2}" fill="${ESC}"/>
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${fundo}" stroke="#fff" stroke-opacity=".92" stroke-width="2.4"${mist ? ' stroke-dasharray="5 4"' : ''}/>
    <rect x="${x + 3}" y="${y + 3}" width="${s - 6}" height="${s * 0.3}" rx="${r * 0.8}" fill="#fff" opacity=".24"/>
    ${atras ? `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${ESC}" opacity=".22"/>` : ''}
    ${numero(x + s / 2, y + s / 2, fs, mist ? '?' : n)}
  </g>`;
}

/** Cano como no jogo: cápsula grossa, metade na cor de cada ninho, com brilho (entre dois ninhos). */
function cano(x1: number, y1: number, x2: number, y2: number, corA: number, corB: number = corA, larg = 11): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const linha = (a: number, b: number, c: number, d: number, cor: string, l: number, op = 1) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${cor}" stroke-width="${l}" stroke-opacity="${op}"/>`;
  return `<g stroke-linecap="round">
    ${linha(x1, y1, x2, y2, ESC, larg + 4, 0.85)}
    ${linha(x1, y1, mx, my, P(corA).cor, larg)}${linha(mx, my, x2, y2, P(corB).cor, larg)}
    ${linha(x1 - larg * 0.18, y1 - larg * 0.2, x2 - larg * 0.18, y2 - larg * 0.2, '#fff', Math.max(1.5, larg * 0.2), 0.5)}</g>`;
}

/** Formiga (olhando para cima), centrada em (cx,cy), com tamanho s e giro `ang` (graus). */
function formiga(cx: number, cy: number, s: number, cor: number, ang = 0): string {
  const svg = formigaSvg(cor, 'sem-simbolo').replace('<svg ', `<svg x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;overflow:visible" `);
  return `<g transform="translate(${cx} ${cy}) rotate(${ang})">${svg}</g>`;
}

/** Quadro com moldura lilás (como no jogo): cada letra '0'..'9' é uma cor da paleta, '.' é vazio. */
function quadro(x: number, y: number, s: number, linhas: string[], marcar?: (c: number, l: number, cor: number) => 'ring' | 'fraco' | ''): string {
  const w = linhas[0].length * s;
  const h = linhas.length * s;
  let r = `<rect x="${x - 9}" y="${y - 9}" width="${w + 18}" height="${h + 18}" rx="14" fill="#a3a7d1" stroke="#7c81b3" stroke-width="2"/>
    <rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="9" fill="#4f5384"/>`;
  const aneis: string[] = [];
  linhas.forEach((lin, l) =>
    [...lin].forEach((ch, c) => {
      if (ch === '.') return;
      const cor = Number(ch);
      const m = marcar?.(c, l, cor) ?? '';
      r += quad(x + c * s + 1, y + l * s + 1, cor, s - 2, m === 'fraco' ? 'opacity=".35"' : '');
      if (m === 'ring') aneis.push(`<rect x="${x + c * s - 1}" y="${y + l * s - 1}" width="${s + 2}" height="${s + 2}" rx="${s * 0.26}" fill="none" stroke="${ESC}" stroke-width="6"/><rect x="${x + c * s - 1}" y="${y + l * s - 1}" width="${s + 2}" height="${s + 2}" rx="${s * 0.26}" fill="none" stroke="#fff" stroke-width="3"/>`);
    }),
  );
  return r + aneis.join('');
}

/** Buraco escuro com a tampa de bueiro ao lado (centro do buraco em cx,cy). */
const buraco = (cx: number, cy: number) =>
  `<ellipse cx="${cx + 22}" cy="${cy + 3}" rx="22" ry="11" fill="#5d6196"/><ellipse cx="${cx + 22}" cy="${cy}" rx="22" ry="11" fill="#c3c6e2"/><ellipse cx="${cx + 22}" cy="${cy}" rx="14" ry="6" fill="#959ac3"/>
   <ellipse cx="${cx}" cy="${cy}" rx="28" ry="13" fill="#121222"/><ellipse cx="${cx}" cy="${cy + 2}" rx="20" ry="8" fill="#060610"/>`;

/** Vaga: quadrado branco arredondado (como no jogo), centro em (cx,cy). `destaque` = contorno verde pontilhado (vaga livre pedida). */
const vaga = (cx: number, cy: number, s = 38, destaque = false) =>
  `<rect x="${cx - s / 2}" y="${cy - s / 2 + 4}" width="${s}" height="${s}" rx="${s * 0.18}" fill="#c3c6dc"/>
   <rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="${s * 0.18}" fill="#fff"/>
   ${destaque ? `<rect x="${cx - s / 2 - 4}" y="${cy - s / 2 - 4}" width="${s + 8}" height="${s + 8}" rx="${s * 0.24}" fill="none" stroke="#7dea4a" stroke-width="3.5" stroke-dasharray="6 4"/>` : ''}`;
const VX = (i: number) => 24 + i * 48; // centros das 5 vagas numa cena de largura 240

/** Seta branca com contorno escuro (fica legível no fundo azul). */
const seta = (d: string, cor = '#fff') =>
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${ESC}" stroke-width="8"/><path d="${d}" stroke="${cor}" stroke-width="4"/></g>`;

/** Lugar vazio pontilhado na grade (de onde um ninho saiu). */
const vazio = (x: number, y: number, s: number) =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.22}" fill="#000" fill-opacity=".1" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="6 5"/>`;

/** Brilhinho (estrela de 4 pontas) em (cx,cy). */
const brilho = (cx: number, cy: number, r: number) =>
  `<path d="M${cx} ${cy - r}Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z" fill="#ffe27a" stroke="${ESC}" stroke-width="2"/>`;

const svg = (alt: string, vb: string, corpo: string) => `<div class="ilus"><svg class="cena" viewBox="${vb}" role="img" aria-label="${alt}">${corpo}</svg></div>`;

// colunas da grade de ninhos nas cenas (3 colunas, lado 44)
const GS = 44;
const GX = (c: number) => 120 + (c - 1) * 54 - GS / 2;

const ILUSTRACOES: string[] = [
  // 1: ninho tem cor e número = quantos quadradinhos
  svg(
    'Um ninho vermelho com o número 4 e quatro quadradinhos vermelhos; um ninho azul com o número 2 e dois quadradinhos azuis',
    '0 0 240 160',
    `${ninho(28, 12, 76, 0, 4)}${ninho(136, 12, 76, 4, 2)}
     ${[0, 1, 2, 3].map((k) => quad(23 + k * 22, 116, 0, 19)).join('')}
     ${[0, 1].map((k) => quad(152 + k * 22, 116, 4, 19)).join('')}`,
  ),
  // 2: toque num ninho da frente; ele sobe para uma vaga e as formigas saem
  svg(
    'Um ninho sai da frente da grade, sobe para uma vaga e duas formigas saem dele em direção ao quadro',
    '0 0 240 288',
    `${quadro(70, 10, 20, ['.022.', '02240', '.022.'])}
     ${buraco(110, 100)}
     ${[0, 1, 3, 4].map((i) => vaga(VX(i), 148)).join('')}
     ${ninho(VX(2) - 19, 129, 38, 0, 3)}
     ${formiga(VX(2) - 36, 118, 24, 0, -35)}${formiga(VX(2) + 40, 112, 24, 0, 30)}
     ${ninho(GX(0), 238, GS, 2, 2, true)}${ninho(GX(1), 238, GS, 3, 5, true)}${ninho(GX(2), 238, GS, 6, 3, true)}
     ${ninho(GX(0), 186, GS, 4, 4)}${vazio(GX(1), 186, GS)}${ninho(GX(2), 186, GS, 0, 2)}
     ${seta(`M120 196V180`)}${seta(`M112 186l8-9 8 9`)}`,
  ),
  // 3: formiga pega um quadradinho da cor do ninho que esteja na borda e leva ao buraco
  svg(
    'Uma formiga azul pega um quadradinho azul da borda do desenho e leva ao buraco; os azuis do meio ficam esperando',
    '0 0 240 222',
    `${quadro(50, 12, 28, ['04240', '42424', '04440', '02400'], (c, l, cor) => {
      if (cor !== 4) return '';
      const meio = l >= 1 && l <= 2 && c >= 1 && c <= 3;
      return meio ? 'fraco' : 'ring';
    })}
     ${buraco(182, 190)}
     ${formiga(62, 188, 46, 4, 90)}
     ${quad(86, 179, 4, 17)}
     ${seta('M114 188H140')}${seta('M132 180l9 8-9 8')}`,
  ),
  // 4: só 5 vagas; ninho que não alcança nada espera e ocupa a vaga
  svg(
    'Cinco vagas, todas ocupadas por ninhos que esperam',
    '0 0 240 172',
    `${[0, 1, 2, 3, 4].map((i) => vaga(VX(i), 82, 42)).join('')}
     ${[ [0, 3], [4, 2], [6, 4], [8, 2], [1, 5] ].map(([c, n], i) => ninho(VX(i) - 18, 64, 36, c, n)).join('')}
     ${[0, 1, 2, 3, 4].map((i) => `<g><circle cx="${VX(i)}" cy="30" r="13" fill="#fff" stroke="${ESC}" stroke-width="2.5"/><circle cx="${VX(i) - 5}" cy="30" r="2.2" fill="${ESC}"/><circle cx="${VX(i)}" cy="30" r="2.2" fill="${ESC}"/><circle cx="${VX(i) + 5}" cy="30" r="2.2" fill="${ESC}"/></g>`).join('')}
     <rect x="8" y="124" width="224" height="40" rx="20" fill="#ff6b5e" stroke="${ESC}" stroke-width="3"/>
     ${numero(120, 144, 20, 'Vagas presas = perdeu')}`,
  ),
  // 5: cano: o ninho ligado sobe junto, mesmo escondido atrás; ficam lado a lado nas vagas
  svg(
    'Dois ninhos ligados por um cano, um atrás do outro, sobem juntos e ficam lado a lado nas vagas',
    '0 0 240 262',
    `${[0, 3, 4].map((i) => vaga(VX(i), 32)).join('')}${vaga(VX(1), 32)}${vaga(VX(2), 32)}
     ${ninho(VX(1) - 19, 13, 38, 1, 3)}${ninho(VX(2) - 19, 13, 38, 1, 2)}
     ${cano(VX(1) + 17, 32, VX(2) - 17, 32, 1, 2)}
     ${seta('M96 150V82', '#7dea4a')}${seta('M86 93l10-11 10 11', '#7dea4a')}
     ${ninho(GX(0), 210, GS, 2, 2, true)}${ninho(GX(1), 210, GS, 1, 2, true)}${ninho(GX(2), 210, GS, 6, 3, true)}
     ${ninho(GX(0), 156, GS, 1, 3)}${ninho(GX(1), 156, GS, 4, 4)}${ninho(GX(2), 156, GS, 3, 2)}
     ${cano(GX(0) + GS / 2, 156 + GS * 0.97, GX(0) + GS / 2, 210 + GS * 0.03, 1, 1, 9)}`,
  ),
  // 6: ninho "?" se revela ao chegar na frente
  svg(
    'Um ninho com ponto de interrogação, atrás, mostra a cor verde quando chega na frente',
    '0 0 240 176',
    `${ninho(28, 20, 58, 0, 3)}${ninho(28, 98, 58, -1, '?', true)}
     ${seta('M102 92H138')}${seta('M129 83l10 9-10 9')}
     ${ninho(154, 20, 58, 3, 2)}${ninho(154, 98, 58, -1, '?', true)}
     ${brilho(150, 18, 9)}${brilho(218, 14, 7)}${brilho(220, 76, 8)}`,
  ),
];

const PASSOS = [
  'Cada <b>ninho</b> tem uma <b>cor</b> e um <b>número</b>: é quantos quadradinhos ele vai buscar.',
  '<b>Toque</b> num ninho da frente. Ele sobe para uma <b>vaga</b> e as formigas saem.',
  'Cada formiga pega um quadradinho <b>da cor do ninho</b> que esteja na <b>borda</b> do desenho.',
  'Só há <b>5 vagas</b>. Ninho que não alcança nada <b>espera na vaga</b>. Se todas ficarem presas, você perde.',
  'Ninhos ligados por <b>cano</b> sobem <b>juntos</b>: lado a lado na frente, ou um atrás do outro. Ficam <b>lado a lado</b> nas vagas até todos terminarem.',
  'Ninho com <b>?</b> é surpresa: a cor aparece quando ele chega na <b>frente</b>.',
];

export function montarTutorial(app: HTMLElement, aoFechar: () => void) {
  let i = 0;
  function desenhar() {
    const ultimo = i === PASSOS.length - 1;
    app.innerHTML = `<div class="tutorial">
      <button class="btn bege pular" id="tPular">Pular</button>
      <div class="passo-n">Passo ${i + 1} de ${PASSOS.length}</div>
      ${ILUSTRACOES[i]}
      <p class="texto-tut">${PASSOS[i]}</p>
      <div class="pontos">${PASSOS.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="nav-tut">${i > 0 ? '<button class="btn bege" id="tVolta">‹ Voltar</button>' : ''}<button class="btn grande verde" id="tProx">${ultimo ? 'Vamos jogar!' : 'Próximo ›'}</button></div>
    </div>`;
    app.querySelector('#tPular')!.addEventListener('click', aoFechar);
    app.querySelector('#tVolta')?.addEventListener('click', () => (i--, desenhar()));
    app.querySelector('#tProx')!.addEventListener('click', () => (ultimo ? aoFechar() : (i++, desenhar())));
  }
  desenhar();
}
