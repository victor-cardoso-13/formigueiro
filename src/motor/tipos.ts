/**
 * Tipos do motor "ninhos e formigas" (inspirado no gênero de quebra-cabeça de formigas que levam quadradinhos ao buraco).
 * Tudo aqui é dado simples (dá para guardar em JSON e clonar com structuredClone).
 *
 * Coordenadas das formigas: em "larguras do quadro" — o quadro vai de x=0 a x=1 e de y=0 a y=h (h = altura/largura).
 * O buraco fica abaixo do quadro e as vagas, mais abaixo ainda (ver geometria.ts).
 */

/** Cor = número da paleta (src/fases/paleta.ts). */
export type Cor = number;

/** Um ninho: tem cor e `n` formigas (= quadradinhos que ele vai levar). */
export interface Ninho {
  id: number;
  cor: Cor;
  /** quantos quadradinhos ele carrega no total */
  n: number;
  /** quantas formigas ainda faltam sair (mostrado no ninho) */
  restam: number;
  /** espera (em passos) até a próxima formiga poder sair */
  espera: number;
  /** ninhos ligados por cano têm o mesmo `grupo` (sobem juntos e precisam de vagas livres para todos) */
  grupo?: number;
}


export interface Ponto {
  x: number;
  y: number;
}

/** Uma formiga em movimento: sai da vaga, vai até um quadradinho exposto, pega e leva ao buraco. */
export interface Formiga {
  id: number;
  ninho: number;
  cor: Cor;
  /** 'ida' = indo buscar; 'volta' = carregando o quadradinho até o buraco */
  fase: 'ida' | 'volta';
  /** quadradinho que ela vai pegar (coluna x, linha y do desenho) */
  alvo: { x: number; y: number };
  /** caminho completo (ida + volta), em larguras do quadro */
  caminho: Ponto[];
  /** comprimento acumulado em cada ponto do caminho */
  acumulado: number[];
  /** comprimento da parte de ida (onde ela pega o quadradinho) */
  compIda: number;
  /** distância já andada */
  prog: number;
}

export type Resultado = 'jogando' | 'vitoria' | 'derrota';

export interface Estado {
  largura: number;
  altura: number;
  /** altura/largura do quadro */
  h: number;
  /** desenho[y][x] = cor do quadradinho, ou -1 se vazio */
  desenho: number[][];
  /** quadradinhos que ainda estão no quadro */
  pedacos: number;
  /** quadradinhos já reservados por uma formiga ("x,y") */
  reservados: Record<string, true>;
  /** grade de ninhos: linhas × colunas; null = sem ninho nesse lugar. Só os da frente de cada coluna podem ser tocados. */
  grade: (Ninho | null)[][];
  /** as vagas (5): ninhos ativos, formigas saindo deles */
  vagas: (Ninho | null)[];
  formigas: Formiga[];
  proximaFormiga: number;
  tique: number;
  resultado: Resultado;
  motivo?: string;
}

/** Ninho como vem no JSON da fase. */
export interface NinhoFase {
  cor: Cor;
  n: number;
  /** ninhos com o mesmo `g` (na mesma linha, lado a lado) estão ligados por cano */
  g?: number;
}

export type Grupo = 'facil' | 'media' | 'dificil' | 'muito-dificil';

/** Fase congelada (fases.json). */
export interface Fase {
  id: number;
  grupo: Grupo;
  nome: string;
  largura: number;
  altura: number;
  /** Uma string por linha: '.' = vazio; senão a cor em base 36 ('0'..'9','a','b'…). */
  desenho: string[];
  /** grade de ninhos (linhas × colunas); null = lugar vazio. Os ids são 1,2,3… em ordem de leitura (linha a linha). */
  grade: (NinhoFase | null)[][];
  /** Sequência de ninhos (ids) tocados que vence, um de cada vez, esperando as formigas terminarem entre os toques. */
  solucao: number[];
  /** Fração (0..1) de partidas ao acaso que ganham. */
  taxaAleatoria: number;
}

/** O que aconteceu (para a tela animar). */
export type Evento =
  | { tipo: 'subiu'; id: number; vaga: number }
  | { tipo: 'moveu'; id: number; vaga: number }
  | { tipo: 'saiu'; formiga: number; ninho: number }
  | { tipo: 'pegou'; formiga: number; x: number; y: number }
  | { tipo: 'entregou'; formiga: number }
  | { tipo: 'ninhoVazio'; id: number; vaga: number }
  | { tipo: 'vitoria' }
  | { tipo: 'derrota'; motivo: string };
