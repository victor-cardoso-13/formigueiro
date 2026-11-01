# Formigueiro — o jogo (especificação)

Jogo de quebra-cabeça para o Victor e a família (idosos primeiro). Slug `formigueiro`.

## A ideia em uma frase
Um **desenho de pixels** feito de pedacinhos de açúcar coloridos está no meio da tela. Você manda
**formigas coloridas** darem uma volta por uma trilha em torno do desenho; cada formiga só come
pedacinhos **da sua cor** e tem uma **fome** (um número). Esvazie o desenho sem lotar os **5 lugares de espera**.

> Originalidade: o laço básico (desenho de blocos + fila de "comedores" numerados + volta em torno
> + 5 lugares de espera) é um gênero comum. **Tudo o mais é nosso**: tema (formigas e açúcar),
> desenhos, tela, peças especiais, ajudas e fases. **Não imite nenhum jogo existente** — nem tela,
> nem desenhos, nem peças especiais, nem barra de "poderes".

## Peças
- **Desenho**: grade L×A de células. Cada célula = um **pedacinho** de uma cor (ou vazio, que já nasce vazio).
- **Trilha**: um anel de células **por fora** do desenho (1 célula de distância). As formigas andam nela.
- **Formigueiro**: de 2 a 5 **colunas** de formigas, embaixo do desenho. Cada formiga tem `cor` e `fome` (número grande nela).
  Só a **primeira de cada coluna** pode ser tocada.
- **Lugares de espera**: **5** folhinhas numa fila, entre o desenho e o formigueiro.

## Como uma formiga anda (regra exata — o motor é por "passos", determinístico)
1. Tocar na primeira formiga de uma coluna (ou numa formiga num lugar de espera) → ela entra na trilha
   pela **entrada** (canto de baixo à esquerda). Se a entrada estiver ocupada por outra formiga, ou se
   já houver **5 formigas na trilha**, o toque é ignorado (a formiga dá uma tremidinha).
2. A cada passo, todas as formigas na trilha andam **1 célula**, na ordem em que entraram.
   Volta completa: sobe pelo lado **esquerdo** (olhando para a direita, ao longo da linha), anda pelo
   **topo** da esquerda para a direita (olhando para baixo, ao longo da coluna), desce pela **direita**
   (olhando para a esquerda), anda por **baixo** da direita para a esquerda (olhando para cima) e chega de novo à entrada.
   Nos cantos ela não olha para nada.
3. Em cada célula da trilha (fora os cantos), ela olha para dentro e acha **o primeiro pedacinho não vazio**
   naquela linha/coluna. Se for **da cor dela** (e puder ser comido agora), ela come: o pedacinho some e `fome − 1`.
   No máximo 1 pedacinho por passo.
4. `fome` chegou a 0 → a formiga vai embora (volta para casa) na hora.
5. Terminou a volta com fome > 0 → vai para o **primeiro lugar de espera livre**.
   Sem lugar livre → **derrota** ("As formigas não têm onde esperar").
6. **Vitória**: o desenho ficou vazio.
### A lógica de comer (clara para o jogador — é um diferencial nosso)
Nada de "mistério": o jogador deve conseguir prever o que a formiga vai comer.
- **Quando come:** só quando está numa célula da trilha **de frente** para uma linha/coluna do desenho
  (nos 4 cantos, não come).
- **O que come:** ela olha **reto para dentro** e só vê **o primeiro pedacinho** daquela linha/coluna
  (os de trás ficam "escondidos" atrás dele). Se esse primeiro for da cor dela, come. Se for de outra cor,
  passa direto — **não pula** para o de trás.
- **Quanto come:** **1 pedacinho por célula da trilha** que ela passa. Numa volta inteira, no máximo uma mordida por
  linha de cada lado. Por isso uma formiga com fome 30 pode precisar de mais de uma volta (e vai para a espera).
- **Em que ordem:** sempre no mesmo sentido: sobe pela esquerda, atravessa o topo, desce pela direita, volta por baixo.
  Ela come na ordem em que passa pelas linhas.
- **Várias formigas na trilha:** quem está **mais à frente** (entrou antes) age primeiro no passo. Se duas veem o mesmo
  pedacinho no mesmo passo, a da frente come.
- **Ajuda visual "o que ela vê":** quando uma formiga está pronta para sair (primeira de uma coluna ou numa folhinha
  de espera), os pedacinhos **da cor dela que estão à vista da trilha** ficam com um contorno brilhante. Ao lado da
  formiga aparece um "👀 N": quantos pedacinhos ela comeria **se saísse agora, sozinha** (o motor simula uma volta;
  conta inclusive os que só ficam à vista depois que ela come o da frente na mesma volta).
- O tutorial tem um passo só para isso: "A formiga só come o primeiro pedacinho que ela vê na linha".

7. Invariante das fases: para cada cor, **soma das fomes = número de pedacinhos daquela cor**


## Peças especiais (nossas) — entram aos poucos
- **Folha seca** (média+): uma folhinha em cima do pedacinho (a cor dele continua **visível** por baixo, nada fica
  escondido); **ninguém come** enquanto a folha estiver lá. A folha **cai quando um vizinho (cima/baixo/esquerda/direita) for comido**. Enquanto coberto,
  ele **tapa a visão** como um pedacinho normal.
- **Formiga dorminhoca** (difícil+): formiga na fila com "zzz" e a cor visível, mas que **não pode ser tocada** ainda.
  Ela acorda depois que **3 formigas quaisquer** saírem do formigueiro (de qualquer coluna) a partir do momento em que
  ela chegou à frente da sua coluna. Mostra um número pequeno (3, 2, 1) que vai descendo.
  (Formigas saindo de um lugar de espera não contam.)
- **Formiga de duas cores** NÃO entra (fica para depois).

## Ajudas (nossas, simples, para idosos)
- **Desfazer** (ilimitado): volta ao estado antes do último toque que mandou uma formiga para a trilha.
  Só funciona com a trilha vazia (senão o botão fica apagado).
- **Recomeçar a fase.**
- **Velocidade da formiga: 1×, 2× ou 5×** (um botão que alterna 1× → 2× → 5× → 1×, com o número escrito grande).
  Muda só a animação: 1× ≈ 120 ms por passo, 2× ≈ 60 ms, 5× ≈ 24 ms. O resultado é sempre o mesmo. A escolha fica salva.
- Nada de "poderes" comprados, moedas ou anúncios.

## As 60 fases
| Grupo | Fases | Desenho | Cores | Colunas | Fome por formiga | Especiais |
|---|---|---|---|---|---|---|
| Fácil | 1–10 | 8×8 a 12×12 | 2–3 | 2 | 4–20 | nenhum; folga grande (resolve quase de qualquer jeito) |
| Média | 11–30 | 12×12 a 16×16 | 3–5 | 3 | 5–30 | folha seca a partir da 16 |
| Difícil | 31–50 | 16×16 a 20×20 | 5–7 | 4 | 5–40 | folha seca, dorminhoca (a partir da 41) |
| Muito difícil | 51–60 | 20×20 a 24×24 | 7–9 | 5 | 5–50 | tudo junto, pouca folga |

- A 1ª fase de cada peça especial é uma fase "de apresentação" com uma faixa curta explicando.
- **Toda fase é gerada com uma solução conhecida** (sequência de toques) e congelada em JSON. Teste prova.
- Dificuldade medida: % de partidas **aleatórias** (toques ao acaso entre os válidos) que ganham.
  Alvos aproximados: fácil > 60%, média 20–60%, difícil 5–20%, muito difícil < 5% (mas sempre com solução).

## Desenhos
- **Originais**, feitos por nós como grades de letras (cada letra = uma cor da paleta). Temas brasileiros e do dia a dia:
  caju, melancia, abacaxi, banana, arara, tucano, gato, cachorro, peixe, tartaruga, joaninha, borboleta, flor,
  girassol, ipê, casa, barco, sol, lua, bolo, sorvete, xícara, coração, estrela, balão, guarda-chuva, árvore, cogumelo, carro, chapéu…
- Orçamento: **~30 desenhos à mão** (10 pequenos para as fáceis + ~20 médios/grandes) + desenhos **gerados por código**
  (mosaicos, mandalas, listras, xadrez, ladrilhos) para completar 60. Fases difíceis podem reusar um desenho
  com outra paleta/tamanho.
- Paleta fixa de ~12 cores bem diferentes entre si (pensar em daltonismo: nada de dois verdes parecidos;
  vermelho × verde nunca juntos sem outra diferença de claro/escuro).

## Tela (idoso primeiro — sem rolagem)
- Em pé: título/fase em cima; desenho; 5 lugares de espera; formigueiro (colunas); botões embaixo
  (Desfazer, Recomeçar, Velocidade 1×/2×/5×, Fases).
- Deitado (iPhone 956×360, iPad 1180×820): desenho à esquerda; à direita lugares de espera + formigueiro + botões.
- Formigas grandes com o número bem legível; o desenho pode ter células pequenas (não se toca nelas).
- Visual padrão da casa: creme + tinta `#3b2f2a` + âmbar, Fredoka/Nunito. Formigas desenhadas em SVG próprio
  (cabecinha, antenas, corpo com a cor), simpáticas.
- Telas: **Início** (Jogar / Fases / Como jogar), **Mapa de fases** (60 botões em 4 grupos, trancadas até ganhar a anterior;
  pode jogar de novo as ganhas), **Jogo**, **Ganhou** (próxima fase), **Perdeu** (Desfazer / Recomeçar).
- **Como jogar**: tutorial de 4–5 passos curtos na 1ª vez, com "Pular" sempre visível; revisitável.
- Progresso no **localStorage** (fases ganhas, fase atual, velocidade, tutorial visto). **Sem Firebase.**
- Se recarregar a página, volta para a tela/fase em que estava.
