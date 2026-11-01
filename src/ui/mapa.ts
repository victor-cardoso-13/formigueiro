/** Mapa de fases: 4 grupos em abas (cada aba cabe sem rolagem). Fases trancadas até ganhar a anterior. */
import type { Fase, Grupo } from '../motor/tipos.ts';
import { liberada, progresso } from './salvar.ts';

const GRUPOS: { id: Grupo; nome: string; cor: string }[] = [
  { id: 'facil', nome: 'Fácil', cor: '#2f9e55' },
  { id: 'media', nome: 'Média', cor: '#e7a400' },
  { id: 'dificil', nome: 'Difícil', cor: '#d9342b' },
  { id: 'muito-dificil', nome: 'Muito difícil', cor: '#8a4bb8' },
];

/** Cadeado branco (fase trancada) e selo com "certo" (fase ganha). */
const CADEADO = '<svg class="cad" viewBox="0 0 24 28" aria-hidden="true"><path d="M7 13V8.5a5 5 0 0 1 10 0V13" style="fill:none;stroke-width:6.5"/><path d="M7 13V8.5a5 5 0 0 1 10 0V13" style="fill:none;stroke:#fff;stroke-width:2.6"/><rect x="2.5" y="12" width="19" height="14" rx="4"/></svg>';
const CERTO = '<span class="ok" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9"/></svg></span>';

export function montarMapa(app: HTMLElement, fases: Fase[], nav: { jogar(id: number): void; inicio(): void }, grupoInicial?: Grupo) {
  const ganhas = new Set(progresso().ganhas);
  const atual = fases.find((f) => !ganhas.has(f.id) && liberada(f.id))?.id ?? progresso().faseAtual;
  let grupo: Grupo = grupoInicial ?? fases.find((f) => f.id === atual)?.grupo ?? 'facil';
  function desenhar() {
    const lista = fases.filter((f) => f.grupo === grupo);
    const total = lista.length;
    const feitas = lista.filter((f) => ganhas.has(f.id)).length;
    app.innerHTML = `<div class="mapa">
      <div class="topo"><button class="btn roxo" id="bInicio">‹ Início</button><h2>Fases</h2><span class="progr">${fases.filter((f) => ganhas.has(f.id)).length}/${fases.length} ★</span></div>
      <div class="abas">${GRUPOS.map((g) => `<button class="aba ${g.id === grupo ? 'ativa' : ''}" data-g="${g.id}" style="--g:${g.cor}">${g.nome}</button>`).join('')}</div>
      <p class="sub-aba">${feitas} de ${total} ganhas</p>
      <div class="grade-fases">${lista
        .map((f) => {
          const ok = liberada(f.id);
          const ga = ganhas.has(f.id);
          return `<button class="fase ${ga ? 'ganha' : ''} ${f.id === atual ? 'atual' : ''}" data-id="${f.id}" ${ok ? '' : 'disabled'} aria-label="Fase ${f.id}${ok ? '' : ', trancada'}">${ok ? `<span class="num">${f.id}</span>` : CADEADO}${ga ? CERTO : ''}</button>`;
        })
        .join('')}${total === 0 ? '<p class="breve">Em breve</p>' : ''}</div>
    </div>`;
    app.querySelector('#bInicio')!.addEventListener('click', nav.inicio);
    for (const b of app.querySelectorAll<HTMLElement>('.aba')) b.addEventListener('click', () => ((grupo = b.dataset.g as Grupo), desenhar()));
    for (const b of app.querySelectorAll<HTMLElement>('.fase')) b.addEventListener('click', () => nav.jogar(Number(b.dataset.id)));
  }
  desenhar();
}
