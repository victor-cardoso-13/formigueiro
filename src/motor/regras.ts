/**
 * TODAS as regras da casa de Formigueiro num lugar só, comentadas com exemplos.
 * Este arquivo não sabe que existe tela.
 */
export const REGRAS = {
  /** Folhinhas de espera entre o desenho e o formigueiro. Encheu e sobrou formiga com fome = derrota. */
  LUGARES_ESPERA: 5,
  /** No máximo 5 formigas andando na trilha ao mesmo tempo (o 6º toque é ignorado). */
  MAX_NA_TRILHA: 5,
  /** Formiga dorminhoca acorda depois de 3 saídas do formigueiro (de qualquer coluna) depois que ela chegou à frente. */
  SAIDAS_PARA_ACORDAR: 3,
  /** Torrão duro: 2 mordidas da cor certa. */
  MORDIDAS_TORRAO: 2,
  /** Toques são guardados nas soluções como número: 0..4 = coluna; 10..14 = lugar de espera 0..4. */
  BASE_ESPERA: 10,
} as const;
