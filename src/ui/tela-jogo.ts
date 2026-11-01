/**
 * A tela do jogo: tabuleiro (canvas), formigas andando (HTML por cima), lugares de espera, formigueiro e botões.
 * Liga os toques às regras do motor (src/motor) e anima um passo do motor por vez (120/60/24 ms).
 */
import { PALETA } from '../fases/paleta.ts';
import { clonar, formigaEm, novoEstado, origemDe, passo, pedacosAVista, previsao, rodarAteParar, tocar } from '../motor/jogo.ts';
import { REGRAS } from '../motor/regras.ts';
import { trilha as geoTrilha } from '../motor/trilha.ts';
import type { Estado, Evento, Fase, Formiga, Origem } from '../motor/tipos.ts';
import { simboloSvg } from '../fases/simbolos.ts';
import { formigaSvg, olhoSvg } from './formiga.ts';
import { ganhou, guardar, progresso, type Velocidade } from './salvar.ts';
import { desenhar, medir, type Geometria } from './tabuleiro.ts';

export interface Navegacao {
  irParaMapa(): void;
  irParaFase(id: number): void;
  abrirTutorial(): void;
  temProxima(id: number): boolean;
}

const MS: Record<Velocidade, number> = { 1: 120, 2: 60, 5: 24 };
const ICONE_DESFAZER = `<svg class="ic" viewBox="0 0 24 24" width="22" height="22"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`;
const ICONE_RECOMECAR = `<svg class="ic" viewBox="0 0 24 24" width="22" height="22"><path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v5h-5"/></svg>`;

export function montarJogo(app: HTMLElement, fase: Fase, nav: Navegacao, demo?: string): () => void {
  let e: Estado = novoEstado(fase);
  const pilha: Estado[] = [];
  let vel: Velocidade = progresso().velocidade;
  let timer = 0;
  let foco: number | null = null;
  let geo: Geometria;
  let t = 64;
  let segs = 3;
  let assinatura = '';
  const elTrilha = new Map<number, { el: HTMLElement; ang: number }>();

  app.innerHTML = `
  <div class="jogo">
    <div class="topo">
      <button class="btn" id="bFases" aria-label="Voltar para as fases">${'☰'} Fases</button>
      <h2>Fase ${fase.id} · ${fase.nome}</h2>
      <button class="btn redondo" id="bAjuda" aria-label="Como jogar">?</button>
    </div>
    <div class="palco"><div class="tab" id="tab"><canvas id="cv"></canvas><div class="sobre" id="sobre"></div></div></div>
    <div class="espera" id="espera"></div>
    <div class="colonia" id="colonia"></div>
    <div class="botoes">
      <button class="btn" id="bDesfazer">${ICONE_DESFAZER} Desfazer</button>
      <button class="btn" id="bRecomecar">${ICONE_RECOMECAR} Recomeçar</button>
      <button class="btn vel" id="bVel" aria-label="Velocidade da formiga: toque para mudar"></button>
    </div>
    <div class="cortina" id="cortina" hidden></div>
  </div>`;
  const $ = <T extends HTMLElement>(id: string) => app.querySelector<T>('#' + id)!;
  const jogoEl = app.querySelector<HTMLElement>('.jogo')!;
  const tab = $('tab');
  const cv = $<HTMLCanvasElement>('cv');
  const sobre = $('sobre');
  const elEspera = $('espera');
  const elColonia = $('colonia');
  const bDesfazer = $<HTMLButtonElement>('bDesfazer');
  const bVel = $<HTMLButtonElement>('bVel');
  const cortina = $('cortina');
  const nCol = fase.colunas.length;

  // ---------- medidas (sem rolagem em nenhum tamanho) ----------
  const alturaBarra = (tt: number) => Math.max(24, Math.round(tt * 0.3));
  const alturaColonia = (tt: number, sg: number) => tt + (sg + 1) * (alturaBarra(tt) + 3) + 34;
  function ajustar() {
    const W = jogoEl.clientWidth;
    const H = jogoEl.clientHeight;
    const paisagem = W > H * 1.1;
    jogoEl.classList.toggle('paisagem', paisagem);
    const gap = 8;
    const razao = (fase.largura + 2) / (fase.altura + 2);
    const eLado = Math.max(48, Math.min(84, Math.floor((paisagem ? W * 0.4 : W) / 5) - 10));
    jogoEl.style.setProperty('--e', `${eLado}px`);
    let boardW: number;
    let boardH: number;
    let hCol: number;
    let wCol: number;
    const topo = paisagem ? 48 : 52;
    const botoes = 58;
    const espera = eLado + 16;
    if (paisagem) {
      const lado = Math.min(H, Math.floor(W * 0.56));
      boardW = Math.min(lado, Math.floor(H * razao));
      boardH = Math.floor(boardW / razao);
      jogoEl.style.gridTemplateColumns = `${lado}px minmax(0, 1fr)`;
      wCol = W - lado - 14;
      hCol = H - topo - botoes - espera - 40;
    } else {
      const fixo = topo + botoes + espera + 40;
      const maxH = H - fixo - 120;
      boardW = Math.min(W, Math.floor(maxH * razao));
      boardH = Math.floor(boardW / razao);
      jogoEl.style.gridTemplateColumns = 'minmax(0, 1fr)';
      wCol = W;
      hCol = H - fixo - boardH;
    }
    const tw = Math.floor((wCol - (nCol - 1) * gap) / nCol) - 2;
    // a altura do formigueiro é reservada (não pula quando as filas encolhem): ladrilho + barrinhas + linha do "+N" + montinho
    segs = 0;
    t = 48;
    achou: for (const sg of [3, 2, 1, 0]) {
      for (let tt = Math.min(tw, 130); tt >= 48; tt -= 2) {
        if (alturaColonia(tt, sg) <= hCol) {
          if (tt >= Math.min(tw, 62) || sg === 0) {
            t = tt;
            segs = sg;
            break achou;
          }
          break;
        }
      }
    }
    if (!paisagem) {
      // sobrou altura? o tabuleiro cresce dentro da largura
      const sobra = hCol - alturaColonia(t, segs);
      if (sobra > 0) {
        const maxH2 = boardH + sobra;
        boardW = Math.min(W, Math.floor(maxH2 * razao));
        boardH = Math.floor(boardW / razao);
      }
    }
    geo = medir(fase.largura, fase.altura, boardW, boardH);
    jogoEl.style.setProperty('--t', `${t}px`);
    jogoEl.style.setProperty('--peek', `${alturaBarra(t)}px`);
    jogoEl.style.setProperty('--colh', `${alturaColonia(t, segs)}px`);
    jogoEl.style.setProperty('--n', String(nCol));
    tab.style.width = `${geo.larguraPx}px`;
    tab.style.height = `${geo.alturaPx}px`;
    assinatura = '';
    redesenhar();
    desenharFormigasTrilha(true);
    renderTudo();
  }

  // ---------- desenho ----------
  function prontas(): Formiga[] {
    const l: Formiga[] = [];
    for (const c of e.colunas) if (c[0] && !c[0].dorme) l.push(c[0]);
    for (const f of e.espera) if (f) l.push(f);
    return l;
  }
  function redesenhar() {
    const aVista = new Set(pedacosAVista(e).map((p) => `${p.x},${p.y}`));
    // com muitas cores prontas o contorno viraria poluição: aí só a cor sob o dedo/mouse é destacada
    const coresProntas = new Set(prontas().map((f) => f.cor));
    desenhar(cv, geo, e, { destacar: coresProntas.size <= 4 ? coresProntas : new Set(), aVista, foco });
  }

  // ---------- formigas na trilha ----------
  const tamanhoFormiga = () => Math.max(geo.s * 1.5, 34);
  function centro(x: number, y: number) {
    return { cx: (x + 1.5) * geo.s, cy: (y + 1.5) * geo.s };
  }
  function anguloDe(pos: number) {
    const g = geoTrilha(e.largura, e.altura);
    const a = g[pos];
    const b = g[(pos + 1) % g.length];
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    return dx === 1 ? 90 : dx === -1 ? 270 : dy === 1 ? 180 : 0;
  }
  function posicionar(id: number, pos: number, fome: number, cor: number, de?: { cx: number; cy: number }) {
    const a = tamanhoFormiga();
    let r = elTrilha.get(id);
    const g = geoTrilha(e.largura, e.altura)[pos];
    const { cx, cy } = centro(g.x, g.y);
    let alvoAng = anguloDe(pos);
    if (!r) {
      const el = document.createElement('div');
      el.className = 'fm-trilha';
      el.innerHTML = formigaSvg(cor, 'sem-simbolo') + `<span class="fome-t"></span>`;
      sobre.appendChild(el);
      r = { el, ang: alvoAng };
      elTrilha.set(id, r);
      el.style.width = el.style.height = `${a}px`;
      el.style.fontSize = `${a * 0.9}px`;
      if (de) {
        el.style.transition = 'none';
        el.style.transform = `translate(${de.cx - a / 2}px, ${de.cy - a / 2}px) rotate(${alvoAng}deg)`;
        void el.offsetWidth;
        el.style.transition = 'transform 240ms ease-out';
      }
    } else {
      el_(r.el, a);
    }
    const delta = ((alvoAng - r.ang + 540) % 360) - 180;
    r.ang += delta;
    alvoAng = r.ang;
    r.el.style.transform = `translate(${cx - a / 2}px, ${cy - a / 2}px) rotate(${alvoAng}deg)`;
    const lab = r.el.querySelector<HTMLElement>('.fome-t')!;
    lab.textContent = String(fome);
    lab.style.transform = `rotate(${-alvoAng}deg)`;
  }
  function el_(el: HTMLElement, a: number) {
    el.style.width = el.style.height = `${a}px`;
    el.style.transition = ''; // volta para a transição do CSS (1 passo por vez, linear)
  }
  function desenharFormigasTrilha(refazer = false) {
    if (refazer) {
      for (const r of elTrilha.values()) r.el.remove();
      elTrilha.clear();
    }
    for (const ft of e.trilha) posicionar(ft.formiga.id, ft.pos, ft.formiga.fome, ft.formiga.cor);
  }
  function sair(id: number, classe: string) {
    const r = elTrilha.get(id);
    if (!r) return;
    elTrilha.delete(id);
    r.el.classList.add(classe);
    setTimeout(() => r.el.remove(), 320);
  }
  function efeito(x: number, y: number, cor: number) {
    const { cx, cy } = centro(x, y);
    const d = document.createElement('div');
    d.className = 'nhac';
    const s = geo.s;
    d.style.cssText = `left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;background:${PALETA[cor].cor}`;
    sobre.appendChild(d);
    setTimeout(() => d.remove(), 320);
  }

  // ---------- formigueiro e espera ----------
  function ladrilho(f: Formiga, previa: number | null, extra = ''): string {
    const { escura } = PALETA[f.cor];
    const dorme = f.dorme && f.dorme > 0;
    return `<div class="f ${dorme ? 'dorme' : ''} ${extra}" style="--c:${escura}">
      ${formigaSvg(f.cor)}
      <span class="n">${f.fome}</span>
      ${dorme ? `<span class="zz">zzz ${f.dorme}</span>` : previa !== null ? `<span class="ol ${previa === 0 ? 'zero' : ''}">${olhoSvg}${previa}</span>` : ''}
    </div>`;
  }
  function renderTudo() {
    const parar = e.resultado === 'jogando';
    const pods = new Map<number, number>();
    for (const f of prontas()) pods.set(f.id, 0);
    const chaveCols = e.colunas.map((c) => c.map((f) => `${f.id}:${f.fome}:${f.dorme ?? 0}`).join(',')).join('|');
    const chaveEsp = e.espera.map((f) => (f ? `${f.id}:${f.fome}` : '-')).join(',');
    const chave = `${chaveCols}#${chaveEsp}#${e.pedacos}#${parar}#${t}#${segs}`;
    if (chave !== assinatura) {
      assinatura = chave;
      elColonia.innerHTML = e.colunas
        .map((col, i) => {
          if (col.length === 0) return `<div class="col vazia"></div>`;
          const f = col[0];
          const dorme = !!f.dorme;
          const p = dorme ? null : previsao(e, { coluna: i }).comeria;
          const seg = col
            .slice(1, 1 + segs)
            .map((x) => `<div class="seg" style="--c:${PALETA[x.cor].cor};--d:${PALETA[x.cor].escura}">${simboloSvg(x.cor, PALETA[x.cor].cor, 15)}<span>${x.dorme ? 'zzz' : x.fome}</span></div>`)
            .join('');
          const mais = col.length - 1 > segs ? `<div class="mais">+${col.length - 1 - segs}</div>` : '';
          return `<div class="col" data-c="${i}" data-cor="${f.cor}"><button class="tile" aria-label="Formiga ${PALETA[f.cor].nome}, fome ${f.fome}">${ladrilho(f, p)}</button>${seg}${mais}</div>`;
        })
        .join('');
      elEspera.innerHTML = e.espera
        .map((f, j) => {
          if (!f) return `<div class="folha"></div>`;
          const p = previsao(e, { espera: j }).comeria;
          return `<button class="folha cheia" data-e="${j}" data-cor="${f.cor}" aria-label="Formiga esperando, ${PALETA[f.cor].nome}, fome ${f.fome}">${ladrilho(f, p, 'peq')}</button>`;
        })
        .join('');
      for (const b of app.querySelectorAll<HTMLElement>('[data-c] .tile, [data-e]')) {
        const pai = b.closest<HTMLElement>('[data-c], [data-e]')!;
        const o: Origem = pai.dataset.c !== undefined ? { coluna: Number(pai.dataset.c) } : { espera: Number(pai.dataset.e) };
        b.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          tocarOrigem(o, b);
        });
        b.addEventListener('pointerenter', () => mudarFoco(Number(pai.dataset.cor)));
        b.addEventListener('pointerleave', () => mudarFoco(null));
      }
    }
    const podeDesfazer = pilha.length > 0 && (e.trilha.length === 0 || e.resultado !== 'jogando');
    bDesfazer.classList.toggle('apagado', !podeDesfazer);
    bDesfazer.setAttribute('aria-disabled', String(!podeDesfazer));
    bVel.innerHTML = `<span class="vn">${vel}×</span><span class="vt">${vel === 1 ? 'Normal' : vel === 2 ? 'Rápido' : 'Turbo'}</span>`;
    jogoEl.style.setProperty('--ms', `${MS[vel]}ms`);
  }
  function mudarFoco(c: number | null) {
    if (foco === c) return;
    foco = c;
    redesenhar();
  }

  // ---------- jogar ----------
  function tocarOrigem(o: Origem, el: HTMLElement) {
    if (e.resultado !== 'jogando' || !cortina.hidden) return;
    const f = formigaEm(e, o);
    const retang = el.getBoundingClientRect();
    const tr = tab.getBoundingClientRect();
    const de = { cx: retang.left + retang.width / 2 - tr.left, cy: retang.top + retang.height / 2 - tr.top };
    const antes = e.trilha.length === 0 ? clonar(e) : null;
    const ev = tocar(e, o);
    if (!ev) {
      el.classList.remove('treme');
      void el.offsetWidth;
      el.classList.add('treme');
      return;
    }
    if (antes) pilha.push(antes);
    if (f) posicionar(f.id, 0, f.fome, f.cor, de);
    aplicar(ev);
    renderTudo();
    redesenhar();
    agendar();
  }
  function aplicar(evs: Evento[]) {
    for (const ev of evs) {
      if (ev.tipo === 'comeu') {
        const cor = ev.sumiu ? corDoEfeito(ev.id) : corDoEfeito(ev.id);
        efeito(ev.x, ev.y, cor);
      } else if (ev.tipo === 'foiEmbora') sair(ev.id, 'foi');
      else if (ev.tipo === 'esperou') sair(ev.id, 'foi');
    }
  }
  const cores = new Map<number, number>();
  for (const col of e.colunas) for (const f of col) cores.set(f.id, f.cor);
  const corDoEfeito = (id: number) => cores.get(id) ?? 0;

  function agendar() {
    if (timer || e.resultado !== 'jogando' || e.trilha.length === 0) return;
    timer = window.setTimeout(passoUI, MS[vel]);
  }
  function passoUI() {
    timer = 0;
    const antesPedacos = e.pedacos;
    const evs = passo(e);
    aplicar(evs);
    desenharFormigasTrilha();
    const mudou = e.pedacos !== antesPedacos || evs.some((x) => x.tipo === 'folhaCaiu' || x.tipo === 'comeu');
    if (mudou) redesenhar();
    if (evs.length) renderTudo();
    if (e.resultado !== 'jogando') return terminar();
    agendar();
    if (e.trilha.length === 0) {
      renderTudo();
      redesenhar();
    }
  }

  function terminar() {
    renderTudo();
    redesenhar();
    if (e.resultado === 'vitoria') {
      ganhou(fase.id);
      for (const r of elTrilha.values()) r.el.remove();
      elTrilha.clear();
      const tem = nav.temProxima(fase.id);
      mostrar(`<div class="cartao"><div class="festa">🎉</div><h2>Ganhou!</h2><p>Os pedacinhos acabaram.</p>
        <div class="acoes">${tem ? `<button class="btn grande ambar" id="cProxima">Próxima fase ›</button>` : ''}
        <button class="btn" id="cFases">Fases</button><button class="btn" id="cDeNovo">Jogar de novo</button></div></div>`);
      app.querySelector('#cProxima')?.addEventListener('click', () => nav.irParaFase(fase.id + 1));
      app.querySelector('#cFases')?.addEventListener('click', () => nav.irParaMapa());
      app.querySelector('#cDeNovo')?.addEventListener('click', recomecar);
    } else {
      mostrar(`<div class="cartao"><div class="festa">😟</div><h2>Perdeu</h2><p>${e.motivo ?? ''}</p>
        <div class="acoes"><button class="btn grande ambar" id="cDesfazer">${ICONE_DESFAZER} Desfazer</button>
        <button class="btn" id="cRecomecar">${ICONE_RECOMECAR} Recomeçar</button></div></div>`);
      const d = app.querySelector<HTMLButtonElement>('#cDesfazer')!;
      d.disabled = pilha.length === 0;
      d.addEventListener('click', desfazer);
      app.querySelector('#cRecomecar')?.addEventListener('click', recomecar);
    }
  }
  function mostrar(html: string) {
    cortina.innerHTML = html;
    cortina.hidden = false;
  }

  function desfazer() {
    if (!pilha.length || (e.trilha.length && e.resultado === 'jogando')) return;
    e = pilha.pop()!;
    window.clearTimeout(timer);
    timer = 0;
    cortina.hidden = true;
    desenharFormigasTrilha(true);
    assinatura = '';
    renderTudo();
    redesenhar();
  }
  function recomecar() {
    window.clearTimeout(timer);
    timer = 0;
    e = novoEstado(fase);
    pilha.length = 0;
    cortina.hidden = true;
    desenharFormigasTrilha(true);
    assinatura = '';
    renderTudo();
    redesenhar();
  }

  $('bFases').addEventListener('click', () => nav.irParaMapa());
  $('bAjuda').addEventListener('click', () => nav.abrirTutorial());
  function aviso(texto: string) {
    const el = document.createElement('div');
    el.className = 'aviso';
    el.textContent = texto;
    jogoEl.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  bDesfazer.addEventListener('click', () => {
    if (e.resultado === 'jogando' && e.trilha.length > 0) return aviso('Espere as formigas pararem');
    if (!pilha.length) return aviso('Ainda não há o que desfazer');
    desfazer();
  });
  $('bRecomecar').addEventListener('click', () => {
    if (e.passo === 0 && pilha.length === 0) return recomecar();
    mostrar(`<div class="cartao"><h2>Recomeçar a fase?</h2><p>O que você já fez nesta fase se perde.</p>
      <div class="acoes"><button class="btn grande ambar" id="cSim">Sim, recomeçar</button><button class="btn grande" id="cNao">Não</button></div></div>`);
    app.querySelector('#cSim')!.addEventListener('click', recomecar);
    app.querySelector('#cNao')!.addEventListener('click', () => (cortina.hidden = true));
  });
  bVel.addEventListener('click', () => {
    vel = vel === 1 ? 2 : vel === 2 ? 5 : 1;
    guardar({ velocidade: vel });
    renderTudo();
  });
  const aoRedimensionar = () => ajustar();
  window.addEventListener('resize', aoRedimensionar);

  // gancho só para o teste automático (?teste=1)
  if (location.search.includes('teste=1')) (window as unknown as { __formigueiro: unknown }).__formigueiro = { estado: () => e };

  // ---------- começo ----------
  ajustar();
  if (demo) aplicarDemo(demo);
  else if (fase.faixa && !progresso().faixasVistas.includes(fase.id)) {
    mostrar(`<div class="cartao"><div class="festa">✨</div><h2>Novidade!</h2><p class="faixa">${fase.faixa}</p><button class="btn grande ambar" id="cEntendi">Entendi</button></div>`);
    app.querySelector('#cEntendi')!.addEventListener('click', () => {
      guardar({ faixasVistas: [...progresso().faixasVistas, fase.id] });
      cortina.hidden = true;
    });
  }

  /** Só para os prints: deixa a fase no meio, ganha ou perdida. */
  function aplicarDemo(d: string) {
    const sol = fase.solucao;
    const feitos = d === 'ganhou' ? sol.length : Math.floor(sol.length * 0.45);
    for (let i = 0; i < feitos; i++) {
      tocar(e, origemDe(sol[i]));
      rodarAteParar(e);
    }
    if (d === 'meio') {
      // mais duas formigas em movimento
      for (let k = 0; k < 2 && feitos + k < sol.length; k++) {
        tocar(e, origemDe(sol[feitos + k]));
        for (let s = 0; s < 7; s++) passo(e);
      }
    }
    if (d === 'perdeu') {
      e.resultado = 'derrota';
      e.motivo = 'As formigas não têm onde esperar';
    }
    desenharFormigasTrilha(true);
    assinatura = '';
    renderTudo();
    redesenhar();
    if (e.resultado !== 'jogando') terminar();
  }

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('resize', aoRedimensionar);
  };
}

void REGRAS;
