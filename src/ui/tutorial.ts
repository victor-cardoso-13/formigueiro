/** Como jogar: 5 passos curtos com desenhos simples, "Pular" sempre visível. */
import { PALETA } from '../fases/paleta.ts';
import { formigaSvg } from './formiga.ts';

const P = (i: number) => PALETA[i];
const TINTA = '#3b2f2a';

/** Quadradinho de açúcar. */
function quad(x: number, y: number, c: number, s: number, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${P(c).cor}" stroke="${P(c).escura}" stroke-width="2" ${extra}/>`;
}

/** Ninho: montinho de terra com a cor, a entrada escura e o número. (x,y) = canto de cima à esquerda. */
function ninho(x: number, y: number, w: number, cor: number, n: number, extra = ''): string {
  const h = w * 0.8;
  const fs = Math.round(w * 0.5);
  return `<g ${extra}>
    <path d="M${x} ${y + h}A${w / 2} ${h} 0 0 1 ${x + w} ${y + h}Z" fill="${P(cor).cor}" stroke="${P(cor).escura}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="${x + w / 2}" cy="${y + h - 1}" rx="${w * 0.2}" ry="${w * 0.07}" fill="${P(cor).escura}"/>
    <text x="${x + w / 2}" y="${y + h * 0.66}" text-anchor="middle" font-size="${fs}" fill="#fff" stroke="${TINTA}" stroke-width="${Math.max(3, fs * 0.2)}" paint-order="stroke" stroke-linejoin="round" class="num">${n}</text>
  </g>`;
}

/** Formiga (olhando para cima), centrada em (cx,cy), com tamanho s e giro `ang` (graus). */
function formiga(cx: number, cy: number, s: number, cor: number, ang = 0): string {
  const svg = formigaSvg(cor, 'sem-simbolo').replace('<svg ', `<svg x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;overflow:visible" `);
  return `<g transform="translate(${cx} ${cy}) rotate(${ang})">${svg}</g>`;
}

/** Quadro de quadradinhos: cada letra '0'..'9' é uma cor da paleta, '.' é vazio. */
function quadro(x: number, y: number, s: number, linhas: string[], marcar?: (c: number, l: number, cor: number) => 'ring' | 'fraco' | ''): string {
  const w = linhas[0].length * s;
  const h = linhas.length * s;
  let r = `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="12" fill="#e3d0ad"/>`;
  linhas.forEach((lin, l) =>
    [...lin].forEach((ch, c) => {
      if (ch === '.') return;
      const cor = Number(ch);
      const m = marcar?.(c, l, cor) ?? '';
      r += quad(x + c * s + 1.5, y + l * s + 1.5, cor, s - 3, m === 'fraco' ? 'opacity=".4"' : '');
      if (m === 'ring') r += `<rect x="${x + c * s - 1}" y="${y + l * s - 1}" width="${s + 2}" height="${s + 2}" rx="${s * 0.28}" fill="none" stroke="#fff" stroke-width="6"/><rect x="${x + c * s - 1}" y="${y + l * s - 1}" width="${s + 2}" height="${s + 2}" rx="${s * 0.28}" fill="none" stroke="${TINTA}" stroke-width="2.5"/>`;
    }),
  );
  return r;
}

const buraco = (cx: number, cy: number) => `<ellipse cx="${cx}" cy="${cy}" rx="30" ry="10" fill="${TINTA}"/><ellipse cx="${cx}" cy="${cy - 2}" rx="24" ry="6" fill="#1d1612"/>`;

/** Vaga (círculo pontilhado) com centro em (cx,cy). */
const vaga = (cx: number, cy: number, cor = '#a8957a', traco = '5 4') =>
  `<circle cx="${cx}" cy="${cy}" r="21" fill="#f6ead4" stroke="${cor}" stroke-width="3" stroke-dasharray="${traco}"/>`;
const VX = (i: number) => 24 + i * 48; // centros das 5 vagas numa cena de largura 240

const svg = (alt: string, vb: string, corpo: string) => `<div class="ilus"><svg class="cena" viewBox="${vb}" role="img" aria-label="${alt}">${corpo}</svg></div>`;

const ILUSTRACOES: string[] = [
  // 1: ninho tem cor e número = quantos quadradinhos
  svg(
    'Um ninho vermelho com o número 4 e quatro quadradinhos vermelhos; um ninho azul com o número 2 e dois quadradinhos azuis',
    '0 0 240 170',
    `${ninho(25, 12, 80, 0, 4)}${ninho(135, 12, 80, 4, 2)}
     ${[0, 1, 2, 3].map((k) => quad(21 + k * 22, 112, 0, 19)).join('')}
     ${[0, 1].map((k) => quad(144 + k * 22, 112, 4, 19)).join('')}`,
  ),
  // 2: toque num ninho da frente; ele sobe para uma vaga e as formigas saem
  svg(
    'Um ninho sobe da grade para uma vaga e duas formigas saem dele em direção ao quadro',
    '0 0 240 250',
    `${quadro(70, 8, 20, ['.022.', '02240', '.022.'])}
     ${buraco(120, 92)}
     ${[0, 1, 2, 3, 4].map((i) => (i === 2 ? '' : vaga(VX(i), 150))).join('')}
     ${ninho(VX(2) - 20, 134, 40, 0, 3)}
     ${formiga(VX(2) - 12, 118, 24, 0, -15)}${formiga(VX(2) + 14, 106, 24, 0, 10)}
     ${ninho(VX(0) - 20, 204, 40, 4, 4)}${ninho(VX(1) - 20, 204, 40, 2, 2)}
     <rect x="${VX(3) - 22}" y="204" width="44" height="34" rx="12" fill="none" stroke="#b5a68b" stroke-width="3" stroke-dasharray="5 4"/>
     ${ninho(VX(4) - 20, 204, 40, 0, 3)}
     <circle cx="${VX(4)}" cy="226" r="23" fill="none" stroke="#e7a400" stroke-width="4"/>
     <g fill="none" stroke="${TINTA}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M${VX(4) - 8} 200Q${VX(3) + 4} 186 ${VX(2) + 30} 172"/><path d="M${VX(2) + 40} 187l-10-15 15-6"/></g>`,
  ),
  // 3: formiga pega um quadradinho da cor do ninho que esteja na borda e leva ao buraco
  svg(
    'Uma formiga azul pega um quadradinho azul da borda do desenho e leva ao buraco; os azuis do meio ficam esperando',
    '0 0 240 220',
    `${quadro(50, 10, 28, ['04240', '42424', '04440', '02400'], (c, l, cor) => {
      if (cor !== 4) return '';
      const meio = l >= 1 && l <= 2 && c >= 1 && c <= 3;
      return meio ? 'fraco' : 'ring';
    })}
     ${buraco(190, 182)}
     ${formiga(66, 184, 46, 4, 90)}
     ${quad(90, 175, 4, 17)}
     <g fill="none" stroke="${TINTA}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M118 184H142"/><path d="M134 175l10 9-10 9"/></g>`,
  ),
  // 4: só 5 vagas; ninho que não alcança nada espera e ocupa a vaga
  svg(
    'Cinco vagas, todas ocupadas por ninhos que esperam',
    '0 0 240 170',
    `${[0, 1, 2, 3, 4].map((i) => vaga(VX(i), 80, '#c42a22', '0')).join('')}
     ${[ [0, 3], [4, 2], [6, 4], [8, 2], [1, 5] ].map(([c, n], i) => ninho(VX(i) - 17, 64, 34, c, n)).join('')}
     ${[0, 1, 2, 3, 4].map((i) => `<g><circle cx="${VX(i)}" cy="34" r="12" fill="#fff" stroke="${TINTA}" stroke-width="2.5"/><circle cx="${VX(i) - 5}" cy="34" r="2" fill="${TINTA}"/><circle cx="${VX(i)}" cy="34" r="2" fill="${TINTA}"/><circle cx="${VX(i) + 5}" cy="34" r="2" fill="${TINTA}"/></g>`).join('')}
     <rect x="8" y="118" width="224" height="40" rx="20" fill="#fde4e0" stroke="#c42a22" stroke-width="3.5"/>
     <text x="120" y="147" text-anchor="middle" font-size="20" fill="#8f1d17" class="num">Vagas presas = perdeu</text>`,
  ),
  // 5: ninhos ligados por cano sobem juntos e precisam de vagas livres para todos
  svg(
    'Dois ninhos ligados por um cano sobem juntos para duas vagas livres',
    '0 0 240 210',
    `${[0, 1, 2, 3, 4].map((i) => (i === 1 || i === 2 ? vaga(VX(i), 40, '#2f9e55', '5 4') : vaga(VX(i), 40, '#a8957a', '0'))).join('')}
     ${[ [VX(0), 2, 3], [VX(3), 0, 2], [VX(4), 8, 2] ].map(([x, c, n]) => ninho(x - 17, 24, 34, c, n)).join('')}
     <g fill="none" stroke="#2f9e55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M${VX(1)} 120V76"/><path d="M${VX(1) - 9} 86L${VX(1)} 74l9 12"/><path d="M${VX(2)} 120V76"/><path d="M${VX(2) - 9} 86L${VX(2)} 74l9 12"/></g>
     ${ninho(VX(1) - 20, 128, 40, 7, 3)}${ninho(VX(2) - 20, 128, 40, 3, 2)}
     <rect x="${VX(1) + 13}" y="140" width="${VX(2) - VX(1) - 26}" height="13" rx="3" fill="#b9b9c4" stroke="${TINTA}" stroke-width="3"/>
     ${ninho(VX(0) - 20, 128, 40, 4, 4)}${ninho(VX(3) - 20, 128, 40, 2, 3)}${ninho(VX(4) - 20, 128, 40, 6, 2)}`,
  ),
];

const PASSOS = [
  'Cada <b>ninho</b> tem uma <b>cor</b> e um <b>número</b>: é quantos quadradinhos ele vai buscar.',
  '<b>Toque</b> num ninho da frente. Ele sobe para uma <b>vaga</b> e as formigas saem.',
  'Cada formiga pega um quadradinho <b>da cor do ninho</b> que esteja na <b>borda</b> do desenho e leva ao buraco.',
  'Só há <b>5 vagas</b>. Ninho que não alcança nada fica esperando e <b>ocupa a vaga</b>. Se todas ficarem presas, você perde.',
  'Ninhos ligados por um <b>cano</b> sobem juntos. Precisam de <b>vagas livres para todos</b>.',
];

export function montarTutorial(app: HTMLElement, aoFechar: () => void) {
  let i = 0;
  function desenhar() {
    const ultimo = i === PASSOS.length - 1;
    app.innerHTML = `<div class="tutorial">
      <button class="btn pular" id="tPular">Pular</button>
      <div class="passo-n">Passo ${i + 1} de ${PASSOS.length}</div>
      ${ILUSTRACOES[i]}
      <p class="texto-tut">${PASSOS[i]}</p>
      <div class="pontos">${PASSOS.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="nav-tut">${i > 0 ? '<button class="btn" id="tVolta">‹ Voltar</button>' : ''}<button class="btn grande ambar" id="tProx">${ultimo ? 'Vamos jogar!' : 'Próximo ›'}</button></div>
    </div>`;
    app.querySelector('#tPular')!.addEventListener('click', aoFechar);
    app.querySelector('#tVolta')?.addEventListener('click', () => (i--, desenhar()));
    app.querySelector('#tProx')!.addEventListener('click', () => (ultimo ? aoFechar() : (i++, desenhar())));
  }
  desenhar();
}
