/** Desenho SVG da formiga (cabecinha, antenas, corpo com a cor, perninhas). Olhando para cima. */
import { PALETA } from '../fases/paleta.ts';
import { SIMBOLOS, corDoSimbolo } from '../fases/simbolos.ts';
import { progresso } from './salvar.ts';

let seq = 0;

export function formigaSvg(cor: number, extra = ''): string {
  const { cor: c, escura: e } = PALETA[cor];
  const id = `fg${cor}_${seq++}`;
  return `<svg class="ant ${extra}" viewBox="0 0 64 64" aria-hidden="true">
<defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="${c}" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
<g stroke="${e}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M24 28 15 24 10 22M24 34 14 34 8 37M25 41 17 45 12 52M40 28 49 24 54 22M40 34 50 34 56 37M39 41 47 45 52 52M29 12Q27 5 21 4M35 12Q37 5 43 4"/></g>
<g fill="${e}"><circle cx="21" cy="4" r="2.4"/><circle cx="43" cy="4" r="2.4"/></g>
<g fill="${c}" stroke="${e}" stroke-width="2.4"><ellipse cx="32" cy="49" rx="12" ry="13"/><ellipse cx="32" cy="33" rx="7" ry="7.5"/><circle cx="32" cy="18" r="10.5"/></g>
<g fill="url(#${id})"><ellipse cx="32" cy="49" rx="12" ry="13"/><ellipse cx="32" cy="33" rx="7" ry="7.5"/><circle cx="32" cy="18" r="10.5"/></g>
<g stroke="${e}" stroke-width="1.4" fill="#fff"><ellipse cx="27.5" cy="15.5" rx="3.8" ry="4.4"/><ellipse cx="36.5" cy="15.5" rx="3.8" ry="4.4"/></g>
<circle cx="27.9" cy="14.4" r="2" fill="#1a1a24"/><circle cx="36.9" cy="14.4" r="2" fill="#1a1a24"/>
${extra.includes('sem-simbolo') || !progresso().ajudas.simbolos ? '' : `<g transform="translate(26 44) scale(1.2)"><path d="${SIMBOLOS[cor].d}" fill="${corDoSimbolo(c)}" ${SIMBOLOS[cor].furo ? 'fill-rule="evenodd"' : ''} stroke="${corDoSimbolo(c) === '#ffffff' ? e : '#fff'}" stroke-width=".6" paint-order="stroke"/></g>`}
</svg>`;
}

