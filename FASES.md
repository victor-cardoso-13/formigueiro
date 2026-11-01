# Fases do Formigueiro

60 fases **congeladas** em `src/fases/fases.json` (gerar de novo: `node scripts/gerar.ts [primeira] [ultima]`, depois `node scripts/gerar.ts tabela` para refazer este arquivo).
**Toda fase tem solução provada** (o gerador e o teste refazem a solução no motor: tocar um ninho, esperar parar, tocar o próximo…).

## Como são feitas
1. **Imagem**: quadro cheio de quadradinhos (desenho à mão ampliado, de retalhos, ou padrão de código) com cor de fundo.
2. **Planejamento com o motor de verdade**: repete-se "uma unidade" (1 ninho, ou 2–3 ninhos de cores diferentes ligados por cano, sempre de cores com quadradinho EXPOSTO no momento) e roda-se num clone até as formigas pararem; o tamanho `n` de cada ninho é reduzido ao que ele realmente entregou. Assim a soma dos `n` de cada cor = quadradinhos da cor.
3. **Grade**: as unidades, na ordem do plano, vão para o fundo de uma coluna (3 colunas nas fases 1–20, 4 nas 21–60). Por isso a solução (a ordem do plano) tem sempre o ninho na frente da coluna na hora de tocar. Cano = ninhos vizinhos na mesma linha (colunas mais baixas ganham um lugar vazio até a linha do cano; a grade fica ~75–95% cheia).
   O botão de dificuldade é a **mistura** do layout: com mistura 0 as linhas são quase completas (o que está na frente é o que o plano pede agora); com mistura alta os ninhos avulsos vão para a "pista" do trecho do plano a que pertencem, então os ninhos da frente são do "futuro" (cor ainda escondida) = armadilhas que enchem as 5 vagas.
4. **Dificuldade medida**: `taxaAleatoria` = fração de partidas em que um robô que toca ao acaso (entre os toques válidos, rodando 0–30 passos entre os toques) vence. O gerador procura (60 partidas por tentativa) a mistura que deixa a taxa na faixa do grupo; se não achar, tenta outro planejamento (ninhos menores, mais canos). A taxa gravada é medida de novo com 200 partidas (outra semente); fora da faixa, tenta mais 2 sementes e guarda a mais próxima.
5. Imagens "sem camadas" (listras, ondas, setas, raios: todas as cores aparecem na borda) são fáceis demais para o robô; para as fases difíceis usam-se imagens em camadas (anéis, molduras, mandalas, retalhos), em que cores ficam escondidas até as de fora saírem.

## Taxas por grupo (média)
- facil: média 1.00 (faixa-alvo 0.7–1)
- media: média 0.52 (faixa-alvo 0.3–0.7)
- dificil: média 0.21 (faixa-alvo 0.1–0.35)
- muito-dificil: média 0.05 (faixa-alvo 0–0.15)

Todas as fases estão dentro da faixa-alvo do grupo.

## Tabela
| id | grupo | nome | tamanho | cores | colunas | ninhos | canos | taxa | faixa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | facil | Coração | 24×21 | 3 | 3 | 18 | 0 | 1 | ok |
| 2 | facil | Estrela | 27×27 | 3 | 3 | 27 | 0 | 1 | ok |
| 3 | facil | Peixe | 36×18 | 4 | 3 | 25 | 0 | 1 | ok |
| 4 | facil | Cogumelo | 30×27 | 4 | 3 | 32 | 0 | 1 | ok |
| 5 | facil | Casinha | 30×27 | 4 | 3 | 31 | 0 | 1 | ok |
| 6 | facil | Balão | 24×33 | 4 | 3 | 32 | 0 | 1 | ok |
| 7 | facil | Flor | 27×33 | 4 | 3 | 29 | 0 | 1 | ok |
| 8 | facil | Árvore | 27×33 | 4 | 3 | 34 | 0 | 1 | ok |
| 9 | facil | Gato | 30×30 | 4 | 3 | 36 | 0 | 1 | ok |
| 10 | facil | Barco | 36×30 | 4 | 3 | 38 | 0 | 1 | ok |
| 11 | media | Abacaxi | 36×39 | 4 | 3 | 98 | 32 | 0.54 | ok |
| 12 | media | Melancia | 40×24 | 5 | 3 | 48 | 5 | 0.56 | ok |
| 13 | media | Listras | 32×24 | 4 | 3 | 40 | 8 | 0.655 | ok |
| 14 | media | Joaninha | 36×30 | 4 | 3 | 57 | 7 | 0.375 | ok |
| 15 | media | Losangos | 34×34 | 5 | 3 | 82 | 26 | 0.445 | ok |
| 16 | media | Borboleta | 40×26 | 5 | 3 | 49 | 8 | 0.315 | ok |
| 17 | media | Arlequim | 32×32 | 5 | 3 | 57 | 11 | 0.655 | ok |
| 18 | media | Sorvete | 32×38 | 6 | 3 | 43 | 0 | 0.39 | ok |
| 19 | media | Vitral | 36×26 | 5 | 3 | 55 | 18 | 0.685 | ok |
| 20 | media | Girassol | 36×38 | 5 | 3 | 71 | 7 | 0.38 | ok |
| 21 | media | Coruja | 40×38 | 6 | 4 | 67 | 5 | 0.465 | ok |
| 22 | media | Tijolinhos | 40×28 | 5 | 4 | 71 | 21 | 0.48 | ok |
| 23 | media | Alvo | 36×36 | 5 | 4 | 56 | 10 | 0.62 | ok |
| 24 | media | Círculos | 36×36 | 5 | 4 | 62 | 15 | 0.64 | ok |
| 25 | media | Molduras | 36×30 | 5 | 4 | 66 | 15 | 0.585 | ok |
| 26 | media | Xadrez | 36×28 | 5 | 4 | 43 | 6 | 0.53 | ok |
| 27 | media | Xadrez escocês | 36×36 | 6 | 4 | 66 | 13 | 0.41 | ok |
| 28 | media | Zigue-zague | 40×28 | 5 | 4 | 47 | 4 | 0.57 | ok |
| 29 | media | Mosaico | 38×30 | 6 | 4 | 87 | 24 | 0.605 | ok |
| 30 | media | Redemoinho | 36×36 | 6 | 4 | 64 | 12 | 0.44 | ok |
| 31 | dificil | Coração de retalhos | 40×36 | 7 | 4 | 60 | 7 | 0.31 | ok |
| 32 | dificil | Mandala | 40×32 | 7 | 4 | 81 | 31 | 0.285 | ok |
| 33 | dificil | Espiral | 40×40 | 7 | 4 | 73 | 21 | 0.22 | ok |
| 34 | dificil | Cogumelo de retalhos | 40×36 | 7 | 4 | 78 | 23 | 0.125 | ok |
| 35 | dificil | Quadrados | 40×32 | 7 | 4 | 65 | 14 | 0.235 | ok |
| 36 | dificil | Molduras II | 44×32 | 7 | 4 | 63 | 14 | 0.35 | ok |
| 37 | dificil | Casinha de retalhos | 40×36 | 8 | 4 | 66 | 13 | 0.1 | ok |
| 38 | dificil | Losangos II | 44×36 | 7 | 4 | 77 | 19 | 0.24 | ok |
| 39 | dificil | Xadrez II | 40×32 | 7 | 4 | 57 | 12 | 0.34 | ok |
| 40 | dificil | Gato de retalhos | 40×40 | 8 | 4 | 75 | 14 | 0.105 | ok |
| 41 | dificil | Arlequim II | 40×40 | 7 | 4 | 70 | 10 | 0.11 | ok |
| 42 | dificil | Alvo II | 40×30 | 7 | 4 | 76 | 28 | 0.285 | ok |
| 43 | dificil | Círculos II | 40×40 | 8 | 4 | 81 | 17 | 0.295 | ok |
| 44 | dificil | Redemoinho II | 44×36 | 8 | 4 | 80 | 19 | 0.295 | ok |
| 45 | dificil | Zigue-zague II | 44×30 | 7 | 4 | 67 | 18 | 0.1 | ok |
| 46 | dificil | Mandala II | 48×36 | 8 | 4 | 79 | 24 | 0.19 | ok |
| 47 | dificil | Setas II | 44×32 | 8 | 4 | 60 | 12 | 0.125 | ok |
| 48 | dificil | Xadrez escocês II | 40×40 | 7 | 4 | 82 | 23 | 0.155 | ok |
| 49 | dificil | Anéis | 44×36 | 7 | 4 | 73 | 19 | 0.195 | ok |
| 50 | dificil | Peixe de retalhos | 48×24 | 7 | 4 | 71 | 24 | 0.2 | ok |
| 51 | muito-dificil | Barco de retalhos | 48×40 | 9 | 4 | 123 | 44 | 0.14 | ok |
| 52 | muito-dificil | Mandala III | 48×36 | 9 | 4 | 84 | 32 | 0 | ok |
| 53 | muito-dificil | Redemoinho III | 48×40 | 9 | 4 | 93 | 34 | 0.035 | ok |
| 54 | muito-dificil | Mandala V | 44×40 | 8 | 4 | 117 | 46 | 0.15 | ok |
| 55 | muito-dificil | Mosaico III | 48×40 | 9 | 4 | 96 | 27 | 0.07 | ok |
| 56 | muito-dificil | Tijolinhos III | 48×36 | 9 | 4 | 77 | 20 | 0.03 | ok |
| 57 | muito-dificil | Círculos III | 40×40 | 9 | 4 | 80 | 24 | 0 | ok |
| 58 | muito-dificil | Mandala IV | 48×40 | 10 | 4 | 107 | 30 | 0 | ok |
| 59 | muito-dificil | Coruja de retalhos | 42×39 | 9 | 4 | 78 | 28 | 0.04 | ok |
| 60 | muito-dificil | Redemoinho IV | 48×40 | 11 | 4 | 97 | 30 | 0 | ok |
