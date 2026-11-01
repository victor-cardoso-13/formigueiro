import type { Fase, NinhoFase } from '../src/motor/tipos.ts';

/** Monta uma fase pequena para os testes. `desenho` usa '.' para vazio e dígitos para cores. */
export function fase(desenho: string[], grade: (NinhoFase | null)[][]): Fase {
  return {
    id: 0,
    grupo: 'facil',
    nome: 'teste',
    largura: desenho[0].length,
    altura: desenho.length,
    desenho,
    grade,
    solucao: [],
    taxaAleatoria: 0,
  };
}
