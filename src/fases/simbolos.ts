/**
 * Um símbolo simples para cada cor, para quem não distingue bem algumas cores (daltonismo):
 * aparece no pedacinho, no corpo da formiga e nas barrinhas da fila. Desenhado numa caixa de 10×10.
 */
export const SIMBOLOS: { d: string; furo?: boolean }[] = [
  { d: 'M5 1a4 4 0 1 0 .001 0z' }, // círculo
  { d: 'M5 1 9.2 9H.8z' }, // triângulo
  { d: 'M1.5 1.5h7v7h-7z' }, // quadrado
  { d: 'M5 .5 9.5 5 5 9.5.5 5z' }, // losango
  { d: 'M4 1h2v3h3v2H6v3H4V6H1V4h3z' }, // cruz
  { d: 'M.8 1h8.4L5 9z' }, // triângulo invertido
  { d: 'M2 1 5 4 8 1 9 2 6 5 9 8 8 9 5 6 2 9 1 8 4 5 1 2z' }, // xis
  { d: 'M5 .5 6.4 3.6 9.7 4 7.2 6.3 7.9 9.6 5 7.9 2.1 9.6 2.8 6.3.3 4 3.6 3.6z' }, // estrela
  { d: 'M1 3.5h8v3H1z' }, // barra deitada
  { d: 'M5 1a4 4 0 1 0 .001 0zM5 3a2 2 0 1 1-.001 0z', furo: true }, // anel
  { d: 'M3.5 1h3v8h-3z' }, // barra em pé
];

/** Cor do símbolo: escuro em cor clara, claro em cor escura. */
export function corDoSimbolo(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#3b2f2a' : '#ffffff';
}

/** SVG avulso do símbolo (para barrinhas e legendas). */
export function simboloSvg(cor: number, hex: string, px: number): string {
  const s = SIMBOLOS[cor];
  return `<svg class="simb" viewBox="0 0 10 10" width="${px}" height="${px}" aria-hidden="true"><path d="${s.d}" fill="${corDoSimbolo(hex)}" ${s.furo ? 'fill-rule="evenodd"' : ''} stroke="${corDoSimbolo(hex) === '#ffffff' ? '#3b2f2a' : '#fff'}" stroke-width=".5" paint-order="stroke"/></svg>`;
}
