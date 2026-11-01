/**
 * TODAS as regras da casa de Formigueiro num lugar só. Este arquivo não sabe que existe tela.
 */
export const REGRAS = {
  /** Vagas onde os ninhos trabalham. Ninho ligado por cano ocupa 2 ou 3 vagas ao mesmo tempo. */
  VAGAS: 5,
  /** Passos entre uma formiga e a próxima saindo do mesmo ninho. */
  ESPERA_ENTRE_FORMIGAS: 5,
  /** Velocidade das formigas: larguras do quadro por passo. */
  VELOCIDADE: 0.04,
  /** Margem do caminho em volta do quadro (em larguras do quadro). */
  MARGEM: 0.025,
  /** Passos por segundo na velocidade 1× (2× e 3× multiplicam). */
  PASSOS_POR_SEGUNDO: 30,
} as const;
