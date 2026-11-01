/** A lista das 60 fases: qual desenho, grupo e peças especiais. */
import { DESENHOS_PEQUENOS } from '../src/fases/desenhos.ts';
import type { Entrada } from './gerador.ts';

export function entradas(): Entrada[] {
  const lista: Entrada[] = [];
  DESENHOS_PEQUENOS.forEach((d, i) => {
    // fáceis: as primeiras sem sobras; depois um pouquinho de sobra, para subir devagar
    const param = i < 3 ? {} : { pSobra: Math.min(0.5, 0.08 * (i - 2)), maxEspera: 3 };
    lista.push({ id: i + 1, grupo: 'facil', nome: d.nome, linhas: d.linhas, semente: 100 + i, param });
  });
  return lista;
}
