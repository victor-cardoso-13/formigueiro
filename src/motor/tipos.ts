/** Tipos do motor. Tudo aqui é "dado simples" (dá para guardar em JSON e clonar). */

/** Cor = número da paleta (src/fases/paleta.ts). */
export type Cor = number;

/** Um pedacinho de açúcar do desenho. */
export interface Celula {
  cor: Cor;
  /** Mordidas que faltam para sumir (1 normal; torrão duro começa com 2). */
  mordidas: number;
  /** Torrão duro (mostra brilho; rachado quando mordidas = 1). */
  duro: boolean;
  /** Folha seca em cima: ninguém come enquanto a folha estiver lá. */
  folha: boolean;
}

export interface Formiga {
  id: number;
  cor: Cor;
  fome: number;
  /** Dorminhoca: quantas saídas faltam para acordar (3,2,1). Ausente/0 = acordada. */
  dorme?: number;
}

export type Origem = { coluna: number } | { espera: number };

export interface FormigaNaTrilha {
  formiga: Formiga;
  /** 0 = entrada (canto de baixo à esquerda). Chega a P = volta completa. */
  pos: number;
  origem: Origem;
}

export type Resultado = 'jogando' | 'vitoria' | 'derrota' | 'travado';

export interface Estado {
  largura: number;
  altura: number;
  /** desenho[y][x]; null = vazio. */
  desenho: (Celula | null)[][];
  /** Colunas do formigueiro; índice 0 = frente (a que pode ser tocada). */
  colunas: Formiga[][];
  /** Lugares de espera. */
  espera: (Formiga | null)[];
  /** Formigas andando, na ordem em que entraram (a mais antiga, que está mais à frente, primeiro). */
  trilha: FormigaNaTrilha[];
  /** Quantas formigas já saíram de colunas do formigueiro. */
  saidas: number;
  passo: number;
  /** Pedacinhos que ainda restam no desenho. */
  pedacos: number;
  resultado: Resultado;
  motivo?: string;
}

export interface FormigaFase {
  cor: Cor;
  fome: number;
  dorme?: boolean;
}

export type Grupo = 'facil' | 'media' | 'dificil' | 'muito-dificil';
export type Especial = 'folha' | 'duro' | 'dorminhoca';

/** Fase congelada (fases.json). */
export interface Fase {
  id: number;
  grupo: Grupo;
  nome: string;
  largura: number;
  altura: number;
  /** Uma string por linha: '.' = vazio; senão a cor em base 36 ('0'..'9','a','b'…). */
  desenho: string[];
  folhas: [number, number][];
  duros: [number, number][];
  colunas: FormigaFase[][];
  especiais: Especial[];
  /** Sequência de toques que vence (ver REGRAS.BASE_ESPERA). Uma formiga por vez. */
  solucao: number[];
  /** Fração (0..1) de partidas ao acaso que ganham. */
  taxaAleatoria: number;
  /** Faixa curta explicando uma peça nova (1ª fase de cada especial). */
  faixa?: string;
}

/** O que aconteceu (para a tela animar). */
export type Evento =
  | { tipo: 'entrou'; id: number; origem: Origem }
  | { tipo: 'comeu'; id: number; x: number; y: number; sumiu: boolean }
  | { tipo: 'folhaCaiu'; x: number; y: number }
  | { tipo: 'foiEmbora'; id: number }
  | { tipo: 'esperou'; id: number; lugar: number }
  | { tipo: 'acordou'; id: number }
  | { tipo: 'vitoria' }
  | { tipo: 'derrota'; motivo: string };
