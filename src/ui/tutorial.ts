/** Como jogar: 5 passos curtos, "Pular" sempre visível. */
import { PALETA } from '../fases/paleta.ts';
import { formigaSvg, olhoSvg } from './formiga.ts';
import { progresso } from './salvar.ts';

const P = (i: number) => PALETA[i];

function quad(x: number, y: number, c: number, s = 34, extra = '') {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${P(c).cor}" stroke="${P(c).escura}" stroke-width="3" ${extra}/>`;
}

const ILUSTRACOES: string[] = [
  // 1: formigas com cor e fome (sem seta)
  `<div class="ilus"><div class="coluna-ilus"><div class="mini-tile" style="--c:${P(4).escura}">${formigaSvg(4)}<span class="n">12</span></div><div class="rot">cor azul · fome 12</div></div>
   <div class="coluna-ilus"><div class="mini-tile" style="--c:${P(0).escura}">${formigaSvg(0)}<span class="n">5</span></div><div class="rot">cor vermelha · fome 5</div></div></div>`,
  // 2: a volta ao redor do desenho
  `<div class="ilus"><svg viewBox="0 0 220 180" width="260" height="213">
    <rect x="10" y="10" width="200" height="160" rx="22" fill="#e3d0ad"/><rect x="40" y="38" width="140" height="104" rx="10" fill="#f6ead4"/>
    ${quad(60, 52, 2)}${quad(98, 52, 0)}${quad(136, 52, 4)}${quad(60, 92, 4)}${quad(98, 92, 2)}${quad(136, 92, 0)}
    <path d="M26 150V26h168v128H40" fill="none" stroke="#3b2f2a" stroke-width="4" stroke-dasharray="3 10" stroke-linecap="round"/>
    <path d="M26 100V80" stroke="#3b2f2a" stroke-width="4"/><path d="M18 90l8-12 8 12" fill="none" stroke="#3b2f2a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg></div>`,
  // 3: só a cor dela
  `<div class="ilus"><div class="mini-tile" style="--c:${P(0).escura}">${formigaSvg(0)}<span class="n">3</span></div>
   <svg viewBox="0 0 230 60" width="230" height="60">${quad(8, 12, 0)}${quad(54, 12, 4)}${quad(100, 12, 0)}${quad(146, 12, 2)}
   <g fill="none" stroke="#2f9e55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 28l8 8 14-16"/><path d="M107 28l8 8 14-16"/></g></svg></div>`,
  // 4: só o primeiro que ela vê (✗ no que não é da cor dela)
  `<div class="ilus"><div class="mini-tile peq" style="--c:${P(4).escura}">${formigaSvg(4)}<span class="n">3</span></div>
   <svg viewBox="0 0 290 70" width="290" height="70"><path d="M2 35h38" stroke="#3b2f2a" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/>
   ${quad(50, 18, 0)}<g fill="none" stroke="#fff" stroke-width="8"><circle cx="68" cy="36" r="13"/><path d="M59 45 77 27"/></g><g fill="none" stroke="#c42a22" stroke-width="4"><circle cx="68" cy="36" r="13"/><path d="M59 45 77 27"/></g>
   ${quad(96, 18, 4, 34, 'opacity=".4"')}${quad(142, 18, 4, 34, 'opacity=".4"')}</svg></div>`,
  // 5: o número com olho
  `<div class="ilus"><div class="mini-tile" style="--c:${P(2).escura}">${formigaSvg(2)}<span class="n">12</span><span class="ol">${olhoSvg}7</span></div></div>`,
  // 6: a espera
  `<div class="ilus col"><div class="espera tut">${[0, 1, 2, 3, 4].map((i) => (i < 2 ? `<div class="folha cheia" style="--e:68px">${i === 0 ? formigaSvg(6) : formigaSvg(1)}</div>` : `<div class="folha" style="--e:68px"></div>`)).join('')}</div></div>`,
];

const PASSOS = [
  'Estas são as formigas. Cada uma tem uma <b>cor</b> e uma <b>fome</b> (o número). Só a formiga da <b>frente</b> de cada fila pode sair.',
  '<b>Toque</b> numa formiga da frente: ela dá uma volta ao redor do desenho.',
  'Ela só come os pedacinhos <b>da sua cor</b>. A cada mordida, a fome diminui.',
  'A formiga só come o <b>primeiro pedacinho</b> que ela vê na linha. Se não for da cor dela, ela passa direto: os de trás ficam escondidos.',
  `O número com o olho (${olhoSvg}) mostra <b>quantos pedacinhos ela comeria</b> se saísse agora.`,
  'Se a volta acabar e ela ainda tiver fome, ela espera numa folhinha. <b>Toque nela</b> para mandar de novo. Só há 5 lugares: se lotar, você perde! O botão <b>Desfazer</b> volta a jogada.',
];

export function montarTutorial(app: HTMLElement, aoFechar: () => void) {
  // o passo do olho (índice 4) só aparece se a ajuda estiver ligada em Ajustes
  const ordem = ILUSTRACOES.map((_, k) => k).filter((k) => k !== 4 || progresso().ajudas.olho);
  let i = 0;
  function desenhar() {
    const ultimo = i === ordem.length - 1;
    const k = ordem[i];
    app.innerHTML = `<div class="tutorial">
      <button class="btn pular" id="tPular">Pular</button>
      <div class="passo-n">Passo ${i + 1} de ${ordem.length}</div>
      ${ILUSTRACOES[k]}
      <p class="texto-tut">${PASSOS[k]}</p>
      <div class="pontos">${ordem.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="nav-tut">${i > 0 ? '<button class="btn" id="tVolta">‹ Voltar</button>' : ''}<button class="btn grande ambar" id="tProx">${ultimo ? 'Vamos jogar!' : 'Próximo ›'}</button></div>
    </div>`;
    app.querySelector('#tPular')!.addEventListener('click', aoFechar);
    app.querySelector('#tVolta')?.addEventListener('click', () => (i--, desenhar()));
    app.querySelector('#tProx')!.addEventListener('click', () => (ultimo ? aoFechar() : (i++, desenhar())));
  }
  desenhar();
}
