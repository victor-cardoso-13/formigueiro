#!/bin/bash
# Gera as fases extra (ids 71–500) em src/fases/fases-extra.json, em vários processos ao mesmo tempo.
# Uso: bash scripts/gerar-extras.sh [processos]   (padrão 8)   — demora horas; pode parar e rodar de novo (refaz só o que falta? não: refaz tudo; use `FALTA=1`).
# Acompanhe com: node scripts/progresso-extras.mjs
cd "$(dirname "$0")/.." || exit 1
source ~/.nvm/nvm.sh >/dev/null 2>&1
N=${1:-8}
rm -rf src/fases/.trava
{
  # fácil e médio (rápidos): lotes de 10; difícil e desafio: lotes de 4
  for a in $(seq 71 10 150); do echo "$a $((a + 9 > 150 ? 150 : a + 9))"; done
  for a in $(seq 151 4 500); do echo "$a $((a + 3 > 500 ? 500 : a + 3))"; done
} | FASES_EXTRA=1 xargs -P "$N" -L 1 sh -c 'node scripts/gerar.ts $0 $1 >> /tmp/extras-$0.log 2>&1'
echo "TERMINOU $(date)" >> /tmp/extras-fim.log
