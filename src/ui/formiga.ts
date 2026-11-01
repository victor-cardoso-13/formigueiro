/** Desenho SVG da formiga (cabecinha, antenas, corpo com a cor, perninhas). Olhando para cima. */
import { PALETA } from '../fases/paleta.ts';
import { SIMBOLOS, corDoSimbolo } from '../fases/simbolos.ts';

export function formigaSvg(cor: number, extra = ''): string {
  const { cor: c, escura: e } = PALETA[cor];
  return `<svg class="ant ${extra}" viewBox="0 0 64 64" aria-hidden="true">
<g stroke="${e}" stroke-width="2.8" stroke-linecap="round" fill="none"><path d="M24 28 10 22M24 34 8 36M25 41 12 52M40 28 54 22M40 34 56 36M39 41 52 52M28 12Q24 4 18 5M36 12Q40 4 46 5"/></g>
<g fill="${c}" stroke="${e}" stroke-width="2.8"><ellipse cx="32" cy="50" rx="11" ry="12"/><ellipse cx="32" cy="33" rx="8" ry="8"/><circle cx="32" cy="18" r="9.5"/></g>
<g stroke="${e}" stroke-width="1.6"><circle cx="28" cy="16" r="3.2" fill="#fff"/><circle cx="36" cy="16" r="3.2" fill="#fff"/></g>
<circle cx="28.6" cy="15.6" r="1.4" fill="#222"/><circle cx="36.6" cy="15.6" r="1.4" fill="#222"/>
${extra.includes('sem-simbolo') ? '' : `<g transform="translate(26 44) scale(1.2)"><path d="${SIMBOLOS[cor].d}" fill="${corDoSimbolo(c)}" ${SIMBOLOS[cor].furo ? 'fill-rule="evenodd"' : ''} stroke="${corDoSimbolo(c) === '#ffffff' ? e : '#fff'}" stroke-width=".6" paint-order="stroke"/></g>`}
</svg>`;
}

export const olhoSvg = `<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
