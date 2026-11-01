/**
 * Paleta fixa (11 cores) pensada para ficarem diferentes entre si, também para quem tem daltonismo:
 * variam em claro/escuro e em tom (nada de dois verdes parecidos; vermelho e verde têm brilhos bem diferentes).
 * A letra é só um apelido para desenhar as grades à mão.
 */
export interface CorPaleta {
  letra: string;
  nome: string;
  /** cor do pedacinho / do corpo da formiga */
  cor: string;
  /** versão mais escura (contorno, sombra) */
  escura: string;
}

export const PALETA: CorPaleta[] = [
  { letra: 'r', nome: 'tomate', cor: '#d9342b', escura: '#8f1d17' },
  { letra: 'o', nome: 'laranja', cor: '#f08a1c', escura: '#a85a00' },
  { letra: 'y', nome: 'amarelo', cor: '#f7d23e', escura: '#a8860a' },
  { letra: 'g', nome: 'verde', cor: '#2f9e55', escura: '#16602f' },
  { letra: 'b', nome: 'azul', cor: '#2f5fd0', escura: '#173a8c' },
  { letra: 'c', nome: 'ciano', cor: '#37c1dc', escura: '#13798d' },
  { letra: 'p', nome: 'roxo', cor: '#8a4bb8', escura: '#52277a' },
  { letra: 'k', nome: 'rosa', cor: '#f58fb8', escura: '#b04a77' },
  { letra: 'm', nome: 'marrom', cor: '#8b5a2b', escura: '#53320f' },
  { letra: 'd', nome: 'grafite', cor: '#3f3f4d', escura: '#1d1d26' },
  { letra: 'w', nome: 'branco', cor: '#fffdf6', escura: '#8c8470' },
];

export const LETRAS = PALETA.map((c) => c.letra).join('');
export const corDeLetra = (l: string): number => LETRAS.indexOf(l);
