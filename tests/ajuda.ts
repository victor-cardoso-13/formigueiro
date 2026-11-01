import type { Fase, FormigaFase } from '../src/motor/tipos.ts';

/** Monta uma fase pequena para os testes. `desenho` usa '.' para vazio e dígitos para cores. */
export function fase(
  desenho: string[],
  colunas: FormigaFase[][],
  extras: Partial<Pick<Fase, 'folhas' | 'duros'>> = {},
): Fase {
  return {
    id: 0,
    grupo: 'facil',
    nome: 'teste',
    largura: desenho[0].length,
    altura: desenho.length,
    desenho,
    folhas: extras.folhas ?? [],
    duros: extras.duros ?? [],
    colunas,
    especiais: [],
    solucao: [],
    taxaAleatoria: 0,
  };
}

export const cel = (e: { desenho: ({ cor: number } | null)[][] }) =>
  e.desenho.map((l) => l.map((c) => (c ? String(c.cor) : '.')).join(''));
