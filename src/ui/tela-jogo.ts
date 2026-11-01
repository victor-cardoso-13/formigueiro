/**
 * A tela do jogo: arena (quadro + buraco + 5 vagas, formigas num canvas por cima), grade de ninhos e botões.
 * Todo o movimento vem do motor (src/motor): a tela só chama `passo(e)` no ritmo certo e desenha o que aconteceu.
 */
import { PALETA } from '../fases/paleta.ts';
import { simboloSvg } from '../fases/simbolos.ts';
import { clonar, frente, motivoDeNaoPoder, ninhosNaGrade, novoEstado, parado, passo, rodarAteParar, tocar, unidade } from '../motor/colonia.ts';
import { buraco, centroVaga } from '../motor/geometria.ts';
import { REGRAS } from '../motor/regras.ts';
import type { Estado, Evento, Fase, Ninho } from '../motor/tipos.ts';
import { ganhou, guardar, progresso } from './salvar.ts';
import {
  apagarCelula,
  desenharCamada,
  desenharQuadro,
  limparCamada,
  medir,
  prepararCanvas,
  px,
  py,
  razaoArena,
  razaoLargura,
  soltarPoeira,
  type Medidas,
  type Particula,
} from './tabuleiro.ts';

export interface Navegacao {
  irParaMapa(): void;
  irParaFase(id: number): void;
  abrirTutorial(): void;
  temProxima(id: number): boolean;
}

type Vel = 1 | 2 | 3;
/** 1× é metade do ritmo antigo; 2× é o antigo normal; 3× segue turbo. */
const MULT_VEL: Record<Vel, number> = { 1: 0.5, 2: 1, 3: 3 };
const NOME_VEL: Record<Vel, string> = { 1: 'Lento', 2: 'Normal', 3: 'Turbo' };
/** Marca "já viu o cartão do cano" em progresso().faixasVistas (não é número de fase). */
const FAIXA_CANO = 9001;

const ICONE_DESFAZER = `<svg class="ic" viewBox="0 0 24 24" width="24" height="24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`;
const ICONE_VEL = `<svg class="ic-vel" viewBox="0 0 30 20" width="30" height="20" aria-hidden="true"><path d="M2 3l12 7-12 7zM15 3l12 7-12 7z"/></svg>`;
const ICONE_FASES = `<svg class="ic" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
const ICONE_RECOMECAR = `<svg class="ic" viewBox="0 0 24 24" width="24" height="24"><path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v5h-5"/></svg>`;

function lerVelocidade(): Vel {
  const v = Number(progresso().velocidade);
  return v === 2 ? 2 : v >= 3 ? 3 : 1;
}

/** Variáveis CSS de cor de um ninho. Como no Colony Flow: número sempre branco com contorno escuro, em qualquer cor. */
function estiloCor(cor: number): string {
  const { cor: c, escura } = PALETA[cor];
  return `--c:${c};--d:${escura}`;
}

/** Tubo dos canos (SVG): contorno, corpo e um brilho fino em cima. Sempre reto (só trechos na horizontal e na vertical). */
function tubo(caminhos: string, larg: number): string {
  return `<g fill="none" stroke-linejoin="round" stroke-linecap="round">
    <g stroke="#3f4370" stroke-width="${larg + 4}">${caminhos}</g>
    <g stroke="#a9aed2" stroke-width="${larg}">${caminhos}</g>
    <g stroke="#dfe2f4" stroke-width="${Math.max(1.5, larg * 0.28)}" transform="translate(0 ${-larg * 0.2})">${caminhos}</g></g>`;
}

export function montarJogo(app: HTMLElement, fase: Fase, nav: Navegacao, demo?: string): () => void {
  let e: Estado = novoEstado(fase);
  // fundo azul-arroxeado (estilo Colony Flow) só na tela do jogo; as outras telas continuam creme
  document.documentElement.classList.add('modo-jogo');
  const metaCor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const corAntes = metaCor?.content;
  if (metaCor) metaCor.content = '#5d6290';
  const pilha: Estado[] = [];
  let vel: Vel = lerVelocidade();
  const R = Math.min(3, fase.grade.length); // linhas de ninhos que aparecem
  const nCol = Math.max(1, ...fase.grade.map((l) => l.length));
  const temCano = fase.grade.some((l) => l.some((n) => n && n.g !== undefined));
  const corDe = new Map<number, number>(); // formiga -> cor
  const particulas: Particula[] = [];
  let m: Medidas = medir(fase.largura, fase.altura, 200);
  // medidas da grade (px)
  let nh = 56;
  let cw = 100;
  let CG = 16;
  let RG = 8;
  let raf = 0;
  let ultimo = 0;
  let acc = 0;
  let verificar = false;
  let fimTimer = 0;
  let fimMostrado = false;
  let avisoTimer = 0;

  app.innerHTML = `
  <div class="jogo" id="jogo">
    <div class="topo">
      <button class="btn roxo" id="bFases" aria-label="Voltar para as fases">${ICONE_FASES} Fases</button>
      <h2 title="${fase.nome}">Fase ${fase.id}</h2>
      <button class="btn vel" id="bVel" aria-label="Velocidade das formigas: toque para mudar"></button>
    </div>
    <div class="palco">
      <div class="arena" id="arena">
        <canvas id="cvQuadro"></canvas>
        <div class="tampa" id="tampa"></div>
        <div class="buraco" id="buraco"></div>
        ${Array.from({ length: REGRAS.VAGAS }, () => `<div class="vaga"></div>`).join('')}
        <svg class="canos-vagas" id="canosVagas" aria-hidden="true"></svg>
        <canvas id="cvFormigas"></canvas>
      </div>
    </div>
    <div class="zona-grade" id="zonaGrade">
      <div class="grade" id="grade"></div>
      <div class="mais" id="mais"></div>
    </div>
    <div class="botoes">
      <button class="btn bege" id="bDesfazer">${ICONE_DESFAZER} Desfazer</button>
      <button class="btn bege" id="bRecomecar">${ICONE_RECOMECAR} Recomeçar</button>
      <button class="btn bege redondo" id="bAjuda" aria-label="Como jogar">?</button>
    </div>
    <div class="cortina" id="cortina" hidden></div>
    <div class="cortina" id="faixa" hidden></div>
  </div>`;
  const $ = <T extends HTMLElement>(id: string) => app.querySelector<T>('#' + id)!;
  const jogoEl = $('jogo');
  const arena = $('arena');
  const canosVagas = $<SVGSVGElement & HTMLElement>('canosVagas');
  const cvQuadro = $<HTMLCanvasElement>('cvQuadro');
  const cvFormigas = $<HTMLCanvasElement>('cvFormigas');
  const buracoEl = $('buraco');
  const tampaEl = $('tampa');
  const vagasEl = [...arena.querySelectorAll<HTMLElement>('.vaga')];
  const zonaGrade = $('zonaGrade');
  const grade = $('grade');
  const mais = $('mais');
  const bDesfazer = $<HTMLButtonElement>('bDesfazer');
  const bVel = $<HTMLButtonElement>('bVel');
  const cortina = $('cortina');
  const faixa = $('faixa');

  // ---------- medidas (sem rolagem em nenhum tamanho) ----------
  function ajustar() {
    const Wj = jogoEl.clientWidth;
    const Hj = jogoEl.clientHeight;
    const grande = Math.min(Wj, Hj) >= 600;
    const paisagem = Wj > Hj * 1.1;
    const bh = grande ? 58 : 52;
    const gap = 10;
    RG = grande ? 10 : 8;
    CG = grande ? 24 : 16;
    const pill = 26;
    const BARRA = 24; // a barra roxa em volta dos botões de baixo
    const cand = grande ? [96, 88, 80, 72, 64, 58] : [66, 62, 58, 54, 50, 48];
    const alturaGrade = (n: number) => R * n + (R - 1) * RG + pill;
    const raz = razaoArena(m.h);
    let W: number;
    let larguraGrade: number;
    if (paisagem) {
      W = Math.min(Hj / raz, (Wj * 0.52) / razaoLargura);
      const dir = Wj - W * razaoLargura - 16;
      const disp = Hj - 2 * bh - 2 * gap - BARRA;
      nh = cand.find((n) => alturaGrade(n) <= disp) ?? cand[cand.length - 1];
      larguraGrade = dir;
      jogoEl.style.gridTemplateColumns = `${Math.floor(W * razaoLargura)}px minmax(0, 1fr)`;
    } else {
      const Wmax = Wj / razaoLargura;
      const disp = Hj - 2 * bh - 3 * gap - BARRA;
      nh = cand[cand.length - 1];
      W = Math.min(Wmax, (disp - alturaGrade(nh)) / raz);
      for (const n of cand) {
        const w = Math.min(Wmax, (disp - alturaGrade(n)) / raz);
        if (w >= 0.72 * Wmax) {
          nh = n;
          W = w;
          break;
        }
      }
      larguraGrade = Wj;
      jogoEl.style.gridTemplateColumns = 'minmax(0, 1fr)';
    }
    W = Math.max(120, Math.floor(W));
    const maxCw = grande ? 180 : 132;
    // ninhos quase quadrados (como os blocos do Colony Flow), nunca "barras" compridas
    cw = Math.floor((Math.min(larguraGrade, nCol * maxCw + (nCol - 1) * CG) - (nCol - 1) * CG) / nCol);
    cw = Math.min(cw, Math.round(nh * 1.3));
    const gw = nCol * cw + (nCol - 1) * CG;
    jogoEl.classList.toggle('paisagem', paisagem);
    jogoEl.classList.toggle('grande', grande);
    jogoEl.style.setProperty('--bh', `${bh}px`);
    jogoEl.style.setProperty('--nh', `${nh}px`);
    m = medir(fase.largura, fase.altura, W);
    // arena
    arena.style.width = `${m.Wt}px`;
    arena.style.height = `${m.Ht}px`;
    const vs = m.W * 0.172;
    jogoEl.style.setProperty('--vs', `${vs}px`);
    canosVagas.setAttribute('width', String(m.Wt));
    canosVagas.setAttribute('height', String(m.Ht));
    const bu = buraco(m.h);
    const bw = m.W * 0.22;
    buracoEl.style.cssText = `left:${px(m, bu.x) - bw / 2}px;top:${py(m, bu.y) - bw * 0.27}px;width:${bw}px;height:${bw * 0.54}px`;
    // tampa de bueiro (só enfeite), encostada à direita do buraco
    tampaEl.style.cssText = `left:${px(m, bu.x) + bw * 0.22}px;top:${py(m, bu.y) - bw * 0.22}px;width:${bw * 0.78}px;height:${bw * 0.46}px`;
    vagasEl.forEach((v, i) => {
      const c = centroVaga(m.h, i);
      v.style.cssText = `left:${px(m, c.x) - vs / 2}px;top:${py(m, c.y) - vs / 2}px;width:${vs}px;height:${vs}px`;
    });
    prepararCanvas(cvFormigas, m.Wt, m.Ht);
    desenharQuadro(cvQuadro, m, e.desenho);
    // grade (altura reservada: não pula quando as filas encolhem)
    zonaGrade.style.width = `${gw}px`;
    zonaGrade.style.height = `${alturaGrade(nh)}px`;
    grade.style.width = `${gw}px`;
    grade.style.height = `${R * nh + (R - 1) * RG}px`;
    renderGrade();
    sincVagas(true);
    atualizarBotoes();
    desenharCamada(cvFormigas, m, e.formigas, particulas, 0, performance.now());
  }

  // ---------- grade de ninhos ----------
  const SIMB = () => progresso().ajudas.simbolos;
  function renderGrade() {
    const frenteOk = new Set(frente(e).filter((n) => podeNaFrente(n.id)).map((n) => n.id));
    const colunas: Ninho[][] = [];
    for (let c = 0; c < nCol; c++) colunas.push(e.grade.map((l) => l[c]).filter((n): n is Ninho => !!n));
    const pos = new Map<number, { x: number; y: number; vis: boolean; grupo?: number }>();
    let escondidos = 0;
    let html = '';
    colunas.forEach((col, c) =>
      col.forEach((n, d) => {
        const vis = d < R;
        if (!vis) escondidos++;
        const x = c * (cw + CG);
        const y = d * (nh + RG);
        pos.set(n.id, { x, y, vis, grupo: n.grupo });
        const simb = SIMB() ? `<span class="simb">${simboloSvg(n.cor, PALETA[n.cor].cor, Math.round(nh * 0.3))}</span>` : '';
        html += `<button class="ninho ${d === 0 && frenteOk.has(n.id) ? 'frente' : 'atras'}${d > 0 && d < R ? ' d' + d : ''}${d === 0 && !frenteOk.has(n.id) ? ' preso' : ''}" data-id="${n.id}" data-len="${String(n.restam).length}" ${vis ? '' : 'hidden'}
          style="left:${x}px;top:${y}px;width:${cw}px;height:${nh}px;${estiloCor(n.cor)}"
          aria-label="Ninho ${PALETA[n.cor].nome}, ${n.restam} formigas">${simb}<span class="n">${n.restam}</span></button>`;
      }),
    );
    // canos entre os ninhos ligados: saem da parte de baixo (o "lado") de cada ninho e correm sempre retos;
    // trechos em pé passam pelo corredor entre as colunas, para nunca cobrir o número de outro ninho.
    const porGrupo = new Map<number, { x: number; y: number }[]>();
    for (const p of pos.values()) if (p.vis && p.grupo !== undefined) porGrupo.set(p.grupo, [...(porGrupo.get(p.grupo) ?? []), { x: p.x + cw / 2, y: p.y + nh * 0.83 }]);
    const larguraTotal = nCol * cw + (nCol - 1) * CG;
    let canos = '';
    let bocas = '';
    const larg = Math.max(6, Math.round(nh * 0.14));
    for (const pts of porGrupo.values()) {
      pts.sort((a, b) => a.x - b.x || a.y - b.y);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (Math.abs(a.y - b.y) < 1) canos += `<path d="M${a.x} ${a.y}H${b.x}"/>`;
        else {
          let gx = a.x + cw / 2 + CG / 2;
          if (Math.abs(a.x - b.x) < 1 && gx > larguraTotal) gx = a.x - cw / 2 - CG / 2;
          canos += `<path d="M${a.x} ${a.y}H${gx}V${b.y}H${b.x}"/>`;
        }
      }
      for (const p of pts) bocas += `<circle cx="${p.x}" cy="${p.y}" r="${larg * 0.85}"/>`;
    }
    const svg = canos
      ? `<svg class="canos" width="${larguraTotal}" height="${R * nh + (R - 1) * RG}" aria-hidden="true">${tubo(canos, larg)}<g fill="#a9aed2" stroke="#3f4370" stroke-width="2">${bocas}</g></svg>`
      : '';
    grade.innerHTML = svg + html;
    mais.textContent = escondidos > 0 ? `+${escondidos} atrás` : '';
  }

  // ---------- vagas (ninhos subidos) ----------
  function criarNinhoVaga(i: number, n: Ninho, de?: DOMRect): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ninho-vaga';
    el.dataset.id = String(n.id);
    el.dataset.len = String(String(n.restam).length);
    el.style.cssText = estiloCor(n.cor);
    el.innerHTML = `${SIMB() ? `<span class="simb">${simboloSvg(n.cor, PALETA[n.cor].cor, 13)}</span>` : ''}<span class="n">${n.restam}</span>`;
    vagasEl[i].appendChild(el);
    if (de) {
      const para = el.getBoundingClientRect();
      const dx = de.left + de.width / 2 - (para.left + para.width / 2);
      const dy = de.top + de.height / 2 - (para.top + para.height / 2);
      const s = Math.max(0.6, Math.min(2, de.height / para.height));
      el.style.zIndex = '8';
      el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: 'translate(0, 0) scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(
        () => (el.style.zIndex = ''),
        () => undefined,
      );
    }
    return el;
  }
  /** Ninhos ligados que estão nas vagas continuam ligados pelo cano (como no Colony Flow). */
  function canosNasVagas() {
    const porGrupo = new Map<number, number[]>();
    e.vagas.forEach((n, i) => {
      if (n && n.grupo !== undefined) porGrupo.set(n.grupo, [...(porGrupo.get(n.grupo) ?? []), i]);
    });
    const vs = m.W * 0.172;
    const larg = Math.max(6, Math.round(vs * 0.12));
    let canos = '';
    let bocas = '';
    for (const idx of porGrupo.values()) {
      if (idx.length < 2) continue;
      const y = py(m, centroVaga(m.h, 0).y) + vs * 0.3;
      const xs = idx.map((i) => px(m, centroVaga(m.h, i).x));
      canos += `<path d="M${xs[0]} ${y}H${xs[xs.length - 1]}"/>`;
      for (const x of xs) bocas += `<circle cx="${x}" cy="${y}" r="${larg * 0.85}"/>`;
    }
    canosVagas.innerHTML = canos ? `${tubo(canos, larg)}<g fill="#a9aed2" stroke="#3f4370" stroke-width="2">${bocas}</g>` : '';
  }
  function sincVagas(forcar = false) {
    canosNasVagas();
    vagasEl.forEach((v, i) => {
      if (forcar) v.replaceChildren();
      const n = e.vagas[i];
      const atual = v.querySelector<HTMLElement>('.ninho-vaga:not(.saindo)');
      if (!n) {
        atual?.remove();
        return;
      }
      if (!atual || atual.dataset.id !== String(n.id)) {
        atual?.remove();
        criarNinhoVaga(i, n);
        return;
      }
      const num = atual.querySelector<HTMLElement>('.n')!;
      const txt = String(n.restam);
      if (num.textContent !== txt) {
        num.textContent = txt;
        atual.dataset.len = String(txt.length);
        num.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 160 });
      }
    });
  }

  // ---------- eventos do motor ----------
  function aplicar(evs: Evento[]) {
    const agora = performance.now();
    for (const ev of evs) {
      if (ev.tipo === 'pegou') {
        apagarCelula(cvQuadro, m, ev.x, ev.y);
        const cx = m.pad + (ev.x + 0.5) * m.cel;
        const cy = m.pad + (ev.y + 0.5) * m.cel;
        soltarPoeira(particulas, cx, cy, corDe.get(ev.formiga) ?? 0, Math.max(5, m.W * 0.03), agora, 5, -1);
      } else if (ev.tipo === 'entregou') {
        const b = buraco(m.h);
        soltarPoeira(particulas, px(m, b.x), py(m, b.y), corDe.get(ev.formiga) ?? 0, Math.max(4, m.W * 0.022), agora, 3, -1);
        buracoEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14, 0.9)' }, { transform: 'scale(1)' }], { duration: 200 });
      } else if (ev.tipo === 'ninhoVazio') {
        const el = vagasEl[ev.vaga].querySelector<HTMLElement>(`.ninho-vaga[data-id="${ev.id}"]`);
        if (el) {
          el.classList.add('saindo');
          el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 260, easing: 'ease-in' }).finished.then(
            () => el.remove(),
            () => el.remove(),
          );
        }
      }
    }
  }

  // ---------- o laço de animação ----------
  let pausado = false;
  const pausar = () => (pausado = true);
  const retomar = () => {
    pausado = false;
    acordar();
  };
  window.addEventListener('formigueiro:pausa', pausar);
  window.addEventListener('formigueiro:retomar', retomar);
  /** O ninho está na frente E os ligados a ele por cano também. */
  function podeNaFrente(id: number): boolean {
    const un = unidade(e, id) ?? [];
    const fr = new Set(frente(e).map((n) => n.id));
    return un.every((n) => fr.has(n.id));
  }
  function ativo(): boolean {
    return !pausado && e.resultado === 'jogando' && cortina.hidden === true && faixa.hidden === true;
  }
  function acordar() {
    if (raf) return;
    ultimo = performance.now();
    raf = requestAnimationFrame(quadro);
  }
  function quadro(agora: number) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (agora - ultimo) / 1000));
    ultimo = agora;
    let passos = 0;
    if (ativo()) {
      if (parado(e)) {
        acc = 0;
        // o motor só decide a derrota dentro de `passo`: depois de um toque, dá um passo para ele conferir
        if (verificar) {
          verificar = false;
          for (const f of e.formigas) corDe.set(f.id, f.cor);
          aplicar(passo(e));
          passos++;
        }
      } else {
        const ve = velEfetiva();
        if (ve !== velMostrada) atualizarBotoes();
        acc += dt * REGRAS.PASSOS_POR_SEGUNDO * MULT_VEL[ve];
        while (acc >= 1 && passos < 30 && e.resultado === 'jogando') {
          acc -= 1;
          for (const f of e.formigas) corDe.set(f.id, f.cor);
          aplicar(passo(e));
          passos++;
        }
        if (passos >= 30) acc = 0;
      }
    }
    if (passos) sincVagas();
    if (e.resultado !== 'jogando' && !fimMostrado) agendarFim();
    const andando = ativo() && !parado(e);
    desenharCamada(cvFormigas, m, e.formigas, particulas, andando ? Math.min(acc, 1) : 0, performance.now());
    if ((ativo() && (!parado(e) || verificar)) || particulas.length > 0) raf = requestAnimationFrame(quadro);
    else limparSePreciso();
  }
  function limparSePreciso() {
    if (!e.formigas.length) limparCamada(cvFormigas, m);
  }

  // ---------- botões e avisos ----------
  /** Velocidade de verdade: quando o último ninho já subiu (não sobra nenhum na grade), vai na máxima até acabar (não muda a escolha salva). */
  const velEfetiva = (): Vel => (ninhosNaGrade(e).length === 0 ? 3 : vel);
  let velMostrada: Vel = vel;
  function atualizarBotoes() {
    velMostrada = velEfetiva();
    const pode = pilha.length > 0;
    bDesfazer.classList.toggle('apagado', !pode);
    bDesfazer.setAttribute('aria-disabled', String(!pode));
    bVel.innerHTML = `${ICONE_VEL}<span class="vtx"><span class="vn">${velMostrada}×</span><span class="vt">${NOME_VEL[velMostrada]}</span></span>`;
    bVel.dataset.vel = String(velMostrada);
  }
  function aviso(texto: string) {
    jogoEl.querySelector('.aviso')?.remove();
    window.clearTimeout(avisoTimer);
    const el = document.createElement('div');
    el.className = 'aviso';
    el.textContent = texto;
    const j = jogoEl.getBoundingClientRect();
    const z = zonaGrade.getBoundingClientRect();
    el.style.left = `${z.left - j.left + z.width / 2}px`;
    el.style.top = `${z.top - j.top + z.height * 0.66}px`;
    jogoEl.appendChild(el);
    avisoTimer = window.setTimeout(() => el.remove(), 2200);
  }
  function tremer(ids: number[]) {
    for (const id of ids) {
      const b = grade.querySelector<HTMLElement>(`.ninho[data-id="${id}"]`);
      if (!b) continue;
      b.classList.remove('treme');
      void b.offsetWidth;
      b.classList.add('treme');
    }
  }

  // ---------- jogar ----------
  function tocarNinho(id: number) {
    if (e.resultado !== 'jogando' || !cortina.hidden || !faixa.hidden) return;
    const motivo = motivoDeNaoPoder(e, id);
    if (motivo === 'vagas') {
      tremer((unidade(e, id) ?? []).map((n) => n.id));
      return aviso('Faltam vagas livres');
    }
    if (motivo === 'atras') {
      const un = unidade(e, id) ?? [];
      tremer(un.map((n) => n.id));
      return aviso(un.length > 1 ? 'Este cano está ligado a um ninho que ainda está atrás' : 'Use os ninhos da frente');
    }
    if (motivo) return;
    const de = new Map<number, DOMRect>();
    for (const n of unidade(e, id) ?? []) {
      const b = grade.querySelector<HTMLElement>(`.ninho[data-id="${n.id}"]`);
      if (b) de.set(n.id, b.getBoundingClientRect());
    }
    pilha.push(clonar(e));
    const evs = tocar(e, id)!;
    for (const ev of evs) if (ev.tipo === 'subiu') criarNinhoVaga(ev.vaga, e.vagas[ev.vaga]!, de.get(ev.id));
    renderGrade();
    atualizarBotoes();
    verificar = true;
    acordar();
  }
  grade.addEventListener('pointerdown', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.ninho');
    if (!b) return;
    ev.preventDefault();
    tocarNinho(Number(b.dataset.id));
  });

  function refazerTudo() {
    window.clearTimeout(fimTimer);
    fimMostrado = false;
    cortina.hidden = true;
    particulas.length = 0;
    acc = 0;
    corDe.clear();
    desenharQuadro(cvQuadro, m, e.desenho);
    renderGrade();
    sincVagas(true);
    atualizarBotoes();
    desenharCamada(cvFormigas, m, e.formigas, particulas, 0, performance.now());
    acordar();
  }
  function desfazer() {
    if (!pilha.length) return aviso('Nada para desfazer');
    e = pilha.pop()!;
    verificar = false;
    refazerTudo();
  }
  function recomecar() {
    e = novoEstado(fase);
    pilha.length = 0;
    verificar = false;
    refazerTudo();
  }

  function mostrar(html: string) {
    cortina.innerHTML = html;
    cortina.hidden = false;
  }
  function terminar() {
    if (e.resultado === 'vitoria') {
      const tem = nav.temProxima(fase.id);
      mostrar(`<div class="cartao"><div class="festa">🎉</div><h2>Ganhou!</h2><p>Os quadradinhos acabaram.</p>
        <div class="acoes">${tem ? `<button class="btn grande ambar" id="cProxima">Próxima fase ›</button>` : ''}
        <button class="btn" id="cFases">Fases</button><button class="btn" id="cDeNovo">Jogar de novo</button></div></div>`);
      cortina.querySelector('#cProxima')?.addEventListener('click', () => nav.irParaFase(fase.id + 1));
      cortina.querySelector('#cFases')!.addEventListener('click', () => nav.irParaMapa());
      cortina.querySelector('#cDeNovo')!.addEventListener('click', recomecar);
    } else {
      const temDesfazer = pilha.length > 0;
      mostrar(`<div class="cartao"><div class="festa">😟</div><h2>Perdeu</h2><p>As vagas encheram.</p>
        <div class="acoes">${temDesfazer ? `<button class="btn grande ambar" id="cDesfazer">${ICONE_DESFAZER} Desfazer</button>` : ''}
        <button class="btn ${temDesfazer ? '' : 'grande ambar'}" id="cRecomecar">${ICONE_RECOMECAR} Recomeçar</button></div></div>`);
      cortina.querySelector('#cDesfazer')?.addEventListener('click', desfazer);
      cortina.querySelector('#cRecomecar')!.addEventListener('click', recomecar);
    }
  }
  function agendarFim(imediato = false) {
    fimMostrado = true;
    if (e.resultado === 'vitoria') ganhou(fase.id);
    if (imediato) return terminar();
    fimTimer = window.setTimeout(terminar, e.resultado === 'vitoria' ? 700 : 500);
  }

  $('bFases').addEventListener('click', () => nav.irParaMapa());
  $('bAjuda').addEventListener('click', () => nav.abrirTutorial());
  bDesfazer.addEventListener('click', desfazer);
  $('bRecomecar').addEventListener('click', () => {
    if (e.resultado !== 'jogando') return;
    if (!pilha.length) return recomecar();
    mostrar(`<div class="cartao"><h2>Recomeçar a fase?</h2><p>O que você fez nesta fase se perde.</p>
      <div class="acoes"><button class="btn grande ambar" id="cSim">Sim, recomeçar</button><button class="btn grande" id="cNao">Não</button></div></div>`);
    cortina.querySelector('#cSim')!.addEventListener('click', recomecar);
    cortina.querySelector('#cNao')!.addEventListener('click', () => {
      cortina.hidden = true;
      acordar();
    });
  });
  bVel.addEventListener('click', () => {
    vel = vel === 1 ? 2 : vel === 2 ? 3 : 1;
    guardar({ velocidade: vel });
    atualizarBotoes();
  });
  const aoRedimensionar = () => ajustar();
  window.addEventListener('resize', aoRedimensionar);

  // gancho só para o teste automático (?teste=1)
  if (location.search.includes('teste=1')) (window as unknown as { __formigueiro: unknown }).__formigueiro = { estado: () => e };

  // ---------- começo ----------
  /** Só para os prints: deixa a fase no meio, ganha, perdida ou com ninhos nas vagas. */
  function aplicarDemo(d: string) {
    const sol = fase.solucao;
    const tocaveis = () => frente(e).filter((n) => motivoDeNaoPoder(e, n.id) === null);
    if (d === 'vagas') {
      for (let k = 0; k < 4; k++) {
        const t = tocaveis()[0];
        if (t) tocar(e, t.id);
      }
      return;
    }
    const feitos = d === 'ganhou' ? sol.length : Math.floor(sol.length * 0.4);
    for (let i = 0; i < feitos; i++) {
      tocar(e, sol[i]);
      rodarAteParar(e);
    }
    if (d === 'meio') {
      for (let k = 0; k < 3; k++) {
        const id = sol[feitos + k] ?? tocaveis()[0]?.id;
        if (id !== undefined) tocar(e, id);
      }
      for (let s = 0; s < 60; s++) passo(e);
    }
    if (d === 'perdeu') {
      e.resultado = 'derrota';
      e.motivo = 'As vagas encheram';
    }
  }
  if (demo) aplicarDemo(demo);
  ajustar();
  if (demo && e.resultado !== 'jogando') agendarFim(true);
  else if (temCano && !demo && !progresso().faixasVistas.includes(FAIXA_CANO)) {
    faixa.innerHTML = `<div class="cartao"><div class="festa">🔧</div><h2>Novidade!</h2><p class="faixa">Ninhos ligados por cano sobem juntos e precisam de vagas livres para todos.</p><button class="btn grande ambar" id="cEntendi">Entendi</button></div>`;
    faixa.hidden = false;
    faixa.querySelector('#cEntendi')!.addEventListener('click', () => {
      guardar({ faixasVistas: [...progresso().faixasVistas, FAIXA_CANO] });
      faixa.hidden = true;
      acordar();
    });
  }
  acordar();

  return () => {
    document.documentElement.classList.remove('modo-jogo');
    if (metaCor && corAntes) metaCor.content = corAntes;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(fimTimer);
    window.clearTimeout(avisoTimer);
    window.removeEventListener('resize', aoRedimensionar);
    window.removeEventListener('formigueiro:pausa', pausar);
    window.removeEventListener('formigueiro:retomar', retomar);
  };
}
